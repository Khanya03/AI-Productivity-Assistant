import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  RECIPIENT_LABELS,
  TONE_LABELS,
  type ActionItem,
  type AiResult,
  type BriefingResult,
  type DailyBrief,
  
  type ExecEmail,
  type MarketBrief,
  type PlanResult,
} from "./exec-types";

const MODEL = "google/gemini-2.5-flash";

// ---------- Input schemas ----------

export const emailInputSchema = z.object({
  recipient: z.enum(["board", "investors", "all-hands", "partners"]),
  tone: z.enum(["formal", "concise", "motivating", "firm"]),
  keyPoints: z.string().trim().min(3, "Add a few key points first.").max(4000),
});

export const briefingInputSchema = z.object({
  notes: z.string().trim().min(20, "Paste your meeting notes first.").max(20000),
  focus: z.object({
    decisions: z.boolean(),
    actions: z.boolean(),
    risks: z.boolean(),
  }),
});

export const plannerInputSchema = z.object({
  tasks: z.string().trim().min(5, "List at least one task first.").max(8000),
  window: z.enum(["today", "week"]),
});

export const briefInputSchema = z.object({
  topic: z.string().trim().min(5, "Enter a topic or paste an article first.").max(15000),
});

export const dailyBriefInputSchema = z.object({
  context: z
    .string()
    .trim()
    .min(20, "Add some context about today's priorities and recent notes.")
    .max(8000),
  meetings: z.string().max(8000).optional().default(""),
  market: z.string().max(8000).optional().default(""),
});

export type EmailInput = z.infer<typeof emailInputSchema>;
export type BriefingInput = z.infer<typeof briefingInputSchema>;
export type PlannerInput = z.infer<typeof plannerInputSchema>;
export type BriefInput = z.infer<typeof briefInputSchema>;
export type DailyBriefInput = z.infer<typeof dailyBriefInputSchema>;

// ---------- Output schemas ----------

const emailOutputSchema = z.object({
  subject: z.string().describe("A crisp executive subject line"),
  body: z.string().describe("The full email body with greeting and sign-off"),
});

const briefingOutputSchema = z.object({
  executiveSummary: z
    .string()
    .describe("3-5 sentence executive summary of the meeting"),
  keyDecisions: z.array(z.string()).describe("Concrete decisions that were made"),
  actionItems: z
    .array(
      z.object({
        task: z.string(),
        owner: z.string().describe("Person or role responsible"),
        priority: z.enum(["High", "Medium", "Low"]),
      }),
    )
    .describe("Action items with delegated owner and priority"),
  riskFactors: z.array(z.string()).describe("Risks, blockers, or concerns raised"),
});

const plannerOutputSchema = z.object({
  overview: z
    .string()
    .describe("One-paragraph strategic rationale for the schedule"),
  blocks: z
    .array(
      z.object({
        start: z.string().describe("Start time, e.g. 09:00 or Mon 09:00"),
        end: z.string().describe("End time, e.g. 10:30 or Mon 10:30"),
        title: z.string(),
        category: z.enum(["focus", "meeting", "buffer", "admin", "strategic"]),
        note: z.string().describe("Why this block matters / what to accomplish"),
      }),
    )
    .describe("Time-blocked schedule ordered chronologically"),
});

const briefOutputSchema = z.object({
  tldr: z
    .array(z.string())
    .length(3)
    .describe("Exactly 3 executive TL;DR bullets"),
  insights: z.array(z.string()).describe("Key strategic insights"),
  takeaways: z.array(z.string()).describe("Recommended actionable takeaways"),
});

const dailyBriefOutputSchema = z.object({
  headline: z
    .string()
    .describe("A crisp, executive one-line headline for the day's brief"),
  topPriorities: z
    .array(
      z.object({
        rank: z.number().describe("Priority rank 1-3"),
        task: z.string().describe("The priority in one clear sentence"),
        why: z.string().describe("Why it matters today"),
      }),
    )
    .length(3)
    .describe("Exactly 3 ranked priorities for today"),
  decisionsPending: z
    .array(z.string())
    .describe("Decisions that need an answer today"),
  stakeholderUpdates: z
    .array(
      z.object({
        audience: z.string().describe("Who needs the update"),
        message: z.string().describe("One-sentence update or ask"),
        urgency: z.enum(["High", "Medium", "Low"]),
      }),
    )
    .describe("Stakeholder updates to send today"),
  marketSnapshot: z
    .array(z.string())
    .describe("2-4 market or competitive intelligence bullets"),
  scheduleBlocks: z
    .array(
      z.object({
        start: z.string().describe("Start time, e.g. 09:00"),
        end: z.string().describe("End time, e.g. 10:30"),
        title: z.string(),
        note: z.string().describe("Why this block matters"),
      }),
    )
    .describe("Proposed time blocks for today"),
  closingNote: z
    .string()
    .describe("Short motivational or strategic closing thought"),
});

// ---------- Helpers ----------

function toFriendlyError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode?: unknown }).statusCode)
      : undefined;
  if (status === 401)
    return new Error("AI is not configured correctly (invalid API key).");
  if (status === 402)
    return new Error(
      "AI credits are exhausted. Add credits in your workspace settings, then try again.",
    );
  if (status === 403)
    return new Error("AI access is blocked by workspace policy.");
  if (status === 429)
    return new Error("The AI service is rate limited. Wait a moment and retry.");
  return new Error(`AI request failed: ${message}`);
}

// Structured generation: asks the model for raw JSON (the gateway does not
// support strict response_format schemas for this model), then parses and
// validates with zod. One retry on malformed output — a transient model
// formatting issue, not a terminal gateway error.
async function generateStructured<T>(options: {
  model: ReturnType<ReturnType<typeof createLovableAiGatewayProvider>>;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  shape: string;
}): Promise<T> {
  const system =
    options.system +
    " Respond with ONLY valid JSON — no markdown fences, no commentary — " +
    "matching this exact shape: " +
    options.shape;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text } = await generateText({
      model: options.model,
      system,
      prompt: options.prompt,
    });
    try {
      const cleaned = text
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```\s*$/, "")
        .trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("no JSON in response");
      return options.schema.parse(JSON.parse(cleaned.slice(start, end + 1)));
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    "The AI returned a malformed response. Please try regenerating.",
    { cause: lastError },
  );
}

// ---------- Runners ----------

export async function runEmailGeneration(
  input: EmailInput,
  apiKey?: string,
): Promise<AiResult<ExecEmail>> {
  if (!apiKey) return { data: mockEmail(input), source: "mock" };
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const output = await generateStructured<ExecEmail>({
      model: gateway(MODEL),
      schema: emailOutputSchema,
      shape: '{"subject": string, "body": string}',
      system:
        "You are ExecPulse AI, a communications ghostwriter for a Fortune-500 CEO. " +
        "Write polished stakeholder emails that sound authoritative, warm, and precise. " +
        "Never invent financial figures or commitments not present in the key points.",
      prompt:
        `Audience: ${RECIPIENT_LABELS[input.recipient]}\n` +
        `Tone: ${TONE_LABELS[input.tone]}\n` +
        `Key points to convey:\n${input.keyPoints}\n\n` +
        "Draft the email with a subject line and full body (greeting, 2-4 short paragraphs, sign-off as 'The Executive Office').",
    });
    return { data: output, source: "ai" };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

export async function runBriefingGeneration(
  input: BriefingInput,
  apiKey?: string,
): Promise<AiResult<BriefingResult>> {
  if (!apiKey) return { data: mockBriefing(input), source: "mock" };
  const focusList = [
    input.focus.decisions && "key decisions",
    input.focus.actions && "action items (with owner and priority)",
    input.focus.risks && "risk factors",
  ]
    .filter(Boolean)
    .join(", ");
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const output = await generateStructured<BriefingResult>({
      model: gateway(MODEL),
      schema: briefingOutputSchema,
      shape: '{"executiveSummary": string, "keyDecisions": string[], "actionItems": [{"task": string, "owner": string, "priority": "High"|"Medium"|"Low"}], "riskFactors": string[]}',
      system:
        "You are ExecPulse AI, a chief-of-staff grade meeting analyst. " +
        "Produce structured executive briefings: concise, decision-oriented, no filler. " +
        "Always populate every schema field; use an empty array when a category has no content.",
      prompt:
        `Requested focus areas: ${focusList || "all areas"}.\n\n` +
        `Raw meeting notes / transcript:\n${input.notes}`,
    });
    return { data: output, source: "ai" };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

export async function runPlanGeneration(
  input: PlannerInput,
  apiKey?: string,
): Promise<AiResult<PlanResult>> {
  if (!apiKey) return { data: mockPlan(input), source: "mock" };
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const output = await generateStructured<PlanResult>({
      model: gateway(MODEL),
      schema: plannerOutputSchema,
      shape: '{"overview": string, "blocks": [{"start": string, "end": string, "title": string, "category": "focus"|"meeting"|"buffer"|"admin"|"strategic", "note": string}]}',
      system:
        "You are ExecPulse AI, an executive performance coach and scheduler for CEOs. " +
        "Prioritize by urgency and strategic importance. Protect deep-work focus blocks, " +
        "cluster low-value admin work, and always include short buffer blocks between demanding items.",
      prompt:
        `Planning window: ${input.window === "today" ? "Today's schedule (single day, 08:00-18:00)" : "Weekly overview (Mon-Fri)"}.\n\n` +
        `Unstructured task list:\n${input.tasks}`,
    });
    return { data: output, source: "ai" };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

export async function runMarketBriefGeneration(
  input: BriefInput,
  apiKey?: string,
): Promise<AiResult<MarketBrief>> {
  if (!apiKey) return { data: mockMarketBrief(input), source: "mock" };
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const output = await generateStructured<MarketBrief>({
      model: gateway(MODEL),
      schema: briefOutputSchema,
      shape: '{"tldr": [string, string, string], "insights": string[], "takeaways": string[]}',
      system:
        "You are ExecPulse AI, a market intelligence analyst briefing a CEO. " +
        "Be specific, commercially minded, and candid about competitive threats. " +
        "If the input is article text, analyze it; if it is a topic, brief on the current landscape. " +
        "The TL;DR must contain exactly 3 bullets.",
      prompt: `Topic / article text / report request:\n${input.topic}`,
    });
    return { data: output, source: "ai" };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

export async function runDailyBriefGeneration(
  input: DailyBriefInput,
  apiKey?: string,
): Promise<AiResult<DailyBrief>> {
  if (!apiKey) return { data: mockDailyBrief(input), source: "mock" };
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const output = await generateStructured<DailyBrief>({
      model: gateway(MODEL),
      schema: dailyBriefOutputSchema,
      shape:
        '{"headline": string, "topPriorities": [{"rank": number, "task": string, "why": string}], "decisionsPending": string[], "stakeholderUpdates": [{"audience": string, "message": string, "urgency": "High"|"Medium"|"Low"}], "marketSnapshot": string[], "scheduleBlocks": [{"start": string, "end": string, "title": string, "note": string}], "closingNote": string}',
      system:
        "You are ExecPulse AI, a chief-of-staff preparing the CEO's morning brief. " +
        "Synthesize scattered context into a single, decision-focused daily briefing. " +
        "Be concise, specific, and action-oriented. Do not invent financial figures. " +
        "Return exactly 3 ranked priorities and 2-4 market bullets.",
      prompt:
        `EXECUTIVE CONTEXT & PRIORITIES:\n${input.context}\n\n` +
        (input.meetings.trim()
          ? `UPCOMING MEETINGS / RECENT NOTES:\n${input.meetings}\n\n`
          : "") +
        (input.market.trim()
          ? `MARKET & COMPETITIVE INTELLIGENCE:\n${input.market}\n\n`
          : "") +
        "Draft the CEO's daily brief using the schema above.",
    });
    return { data: output, source: "ai" };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

// ---------- Realistic mock data (used when no AI key is configured) ----------

function firstLine(text: string, fallback: string): string {
  const line = text.split("\n").find((l) => l.trim().length > 4);
  return line ? line.trim().replace(/^[-*•\d.\s]+/, "").slice(0, 90) : fallback;
}

function mockEmail(input: EmailInput): ExecEmail {
  const audience = RECIPIENT_LABELS[input.recipient];
  const headline = firstLine(input.keyPoints, "Quarterly momentum and strategic priorities");
  const openers: Record<string, string> = {
    formal: `I am writing to provide a formal update on ${headline.charAt(0).toLowerCase() + headline.slice(1)}.`,
    concise: `Quick update: ${headline}.`,
    motivating: `I want to share some energizing progress on ${headline.charAt(0).toLowerCase() + headline.slice(1)} — and what it unlocks next.`,
    firm: `Following our recent reviews, I want to be direct about where we stand on ${headline.charAt(0).toLowerCase() + headline.slice(1)}.`,
  };
  return {
    subject: `${headline} — Update for ${audience}`,
    body:
      `Dear ${audience},\n\n` +
      `${openers[input.tone]}\n\n` +
      `The highlights from this period:\n` +
      input.keyPoints
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 2)
        .slice(0, 5)
        .map((l) => `• ${l.replace(/^[-*•\d.\s]+/, "")}`)
        .join("\n") +
      `\n\nEach of these reflects deliberate execution against our strategic plan. We remain focused on durable growth, disciplined capital allocation, and transparent communication with you as this work progresses.\n\n` +
      `I welcome your questions ahead of our next session, and my office will follow up with supporting materials shortly.\n\n` +
      `With appreciation,\nThe Executive Office`,
  };
}

function mockBriefing(input: BriefingInput): BriefingResult {
  const theme = firstLine(input.notes, "the quarterly operating review");
  const actionItems: ActionItem[] = [
    {
      task: `Circulate a one-page decision memo on ${theme.slice(0, 50)}`,
      owner: "Chief of Staff",
      priority: "High",
    },
    {
      task: "Validate Q3 budget reforecast with Finance before board pre-read",
      owner: "CFO",
      priority: "High",
    },
    {
      task: "Draft customer communication plan for the pricing change",
      owner: "VP Marketing",
      priority: "Medium",
    },
    {
      task: "Schedule follow-up review of hiring plan for the data team",
      owner: "CHRO",
      priority: "Low",
    },
  ];
  return {
    executiveSummary:
      `The session centered on ${theme}. Leadership aligned on the near-term operating priorities, ` +
      `reviewed performance against plan, and flagged two areas requiring board visibility. ` +
      `Overall sentiment was constructive: execution is on track, with focused attention needed on ` +
      `resourcing and the upcoming pricing transition.`,
    keyDecisions: [
      `Approved the revised timeline for ${theme.slice(0, 60)}`,
      "Deferred the EMEA office expansion decision to the next quarterly review",
      "Confirmed the pricing change will proceed with a 60-day customer notice period",
    ],
    actionItems: input.focus.actions ? actionItems : actionItems.slice(0, 2),
    riskFactors: [
      "Hiring pace in engineering may slip behind the product roadmap",
      "Two enterprise accounts flagged renewal concerns ahead of the pricing change",
      "Currency headwinds could compress international margins by ~1pt",
    ],
  };
}

function mockPlan(input: PlannerInput): PlanResult {
  const top = firstLine(input.tasks, "strategic priorities");
  if (input.window === "today") {
    return {
      overview:
        "Today is structured around one protected deep-work block in the morning, decision-heavy meetings before lunch, and lighter administrative work late afternoon. Buffers are placed after the most demanding sessions to absorb overrun and capture follow-ups.",
      blocks: [
        { start: "08:00", end: "08:30", title: "Morning review: inbox triage & priorities", category: "admin", note: "Clear urgent items only; defer the rest." },
        { start: "08:30", end: "10:30", title: `Deep work: ${top.slice(0, 60)}`, category: "focus", note: "Highest strategic leverage — notifications off." },
        { start: "10:30", end: "10:45", title: "Buffer / reset", category: "buffer", note: "Capture notes and actions from the focus block." },
        { start: "10:45", end: "12:00", title: "Leadership decision meetings", category: "meeting", note: "Batch approvals; end each with a named owner." },
        { start: "12:00", end: "13:00", title: "Lunch & informal 1:1", category: "buffer", note: "Use for relationship capital, not email." },
        { start: "13:00", end: "14:30", title: "Strategic review: board pre-read", category: "strategic", note: "Sharpen the narrative and the asks." },
        { start: "14:30", end: "14:45", title: "Buffer", category: "buffer", note: "Overrun absorption." },
        { start: "14:45", end: "16:00", title: "Delegated task sweep & sign-offs", category: "admin", note: "Approve, delegate, or delete — no new work." },
        { start: "16:00", end: "17:00", title: "Stakeholder calls", category: "meeting", note: "Investor and partner touchpoints." },
        { start: "17:00", end: "17:30", title: "Day close: tomorrow's top 3", category: "admin", note: "Write tomorrow's priorities before logging off." },
      ],
    };
  }
  return {
    overview:
      "The week front-loads strategic work on Monday and Tuesday while energy is highest, batches meetings mid-week, and reserves Friday for review and relationship-building. Every day carries at least one buffer block to protect the schedule from overrun.",
    blocks: [
      { start: "Mon 08:30", end: "Mon 11:00", title: `Deep work: ${top.slice(0, 60)}`, category: "focus", note: "Week's most important deliverable." },
      { start: "Mon 13:00", end: "Mon 15:00", title: "Executive team weekly", category: "meeting", note: "Decisions and escalations only." },
      { start: "Tue 09:00", end: "Tue 11:30", title: "Strategic planning block", category: "strategic", note: "Board narrative and capital allocation." },
      { start: "Tue 14:00", end: "Tue 15:00", title: "Buffer / overflow", category: "buffer", note: "Absorb Monday carry-over." },
      { start: "Wed 10:00", end: "Wed 12:00", title: "External meetings batch", category: "meeting", note: "Partners, investors, press — back to back." },
      { start: "Wed 15:00", end: "Wed 16:30", title: "Focus: product & talent reviews", category: "focus", note: "Second-deep work block of the week." },
      { start: "Thu 09:00", end: "Thu 10:00", title: "1:1s with direct reports", category: "meeting", note: "Coaching, not status updates." },
      { start: "Thu 13:00", end: "Thu 15:00", title: "Admin & approvals sweep", category: "admin", note: "Batch all low-leverage decisions." },
      { start: "Fri 09:00", end: "Fri 10:30", title: "Week review & metrics", category: "strategic", note: "Scorecard vs. plan; set next week's top 3." },
      { start: "Fri 14:00", end: "Fri 15:00", title: "Buffer / open door", category: "buffer", note: "Keep unscheduled for what the week surfaced." },
    ],
  };
}

function mockMarketBrief(input: BriefInput): MarketBrief {
  const theme = firstLine(input.topic, "your selected market");
  return {
    tldr: [
      `${theme.slice(0, 80)} is consolidating: the top three players now control a majority of enterprise spend, squeezing mid-tier vendors.`,
      "AI-led workflow automation is the primary battleground — buyers are switching vendors for it, not just adding features.",
      "A window of 2-3 quarters exists to establish category leadership before pricing pressure compresses margins.",
    ],
    insights: [
      "Competitors are shifting from seat-based to outcome-based pricing; early movers are winning larger enterprise contracts.",
      "Talent acquisition in applied AI remains the binding constraint on rivals' roadmap velocity.",
      "Enterprise procurement cycles have shortened ~20% where vendors lead with measurable ROI data.",
      "Regulatory attention on AI outputs is rising in the EU and US — compliance posture is becoming a sales asset.",
    ],
    takeaways: [
      "Commission a competitive teardown of the two fastest-growing rivals within 30 days.",
      "Pilot outcome-based pricing with three strategic accounts this quarter.",
      "Publish an ROI benchmark report to own the value narrative before competitors do.",
    ],
  };
}

function mockDailyBrief(input: DailyBriefInput): DailyBrief {
  const theme = firstLine(input.context, "today's strategic priorities");
  const marketTheme = input.market.trim()
    ? firstLine(input.market, "the competitive landscape")
    : "the competitive landscape";
  return {
    headline: `Today's focus: ${theme.slice(0, 70)}`,
    topPriorities: [
      {
        rank: 1,
        task: theme.slice(0, 90),
        why: "Highest strategic leverage — it unblocks the rest of the week.",
      },
      {
        rank: 2,
        task: "Close the open decision on resourcing for the next quarter",
        why: "Delays here compound into roadmap slippage.",
      },
      {
        rank: 3,
        task: "Align the leadership team on this week's external narrative",
        why: "Consistency with stakeholders protects credibility.",
      },
    ],
    decisionsPending: [
      "Approve or defer the proposed budget reallocation",
      "Confirm the timing of the stakeholder communication",
    ],
    stakeholderUpdates: [
      {
        audience: "Board",
        message: "Short note confirming progress against the quarterly plan.",
        urgency: "Medium",
      },
      {
        audience: "Executive team",
        message: "Reiterate the top three priorities and named owners.",
        urgency: "High",
      },
    ],
    marketSnapshot: [
      `${marketTheme.slice(0, 80)} continues to consolidate around the top players.`,
      "AI-led automation remains the primary differentiator buyers ask about.",
      "Pricing pressure is expected to build over the next two quarters.",
    ],
    scheduleBlocks: [
      { start: "08:30", end: "10:30", title: `Deep work: ${theme.slice(0, 50)}`, note: "Protect this block — no meetings." },
      { start: "10:45", end: "12:00", title: "Decision meetings", note: "Batch approvals; end each with a named owner." },
      { start: "13:00", end: "14:30", title: "Stakeholder touchpoints", note: "Board and partner updates." },
      { start: "15:00", end: "16:00", title: "Review & delegate", note: "Approve, delegate, or delete." },
    ],
    closingNote:
      "Momentum comes from finishing the first priority before noon — everything else follows.",
  };
}

// ================= Executive Calendar Guardrails =================

import {
  FOLLOWUP_TONE_LABELS,
  type CalendarGuardrails,
  type StakeholderInsight,
} from "./exec-types";

export const guardrailsInputSchema = z.object({
  schedule: z
    .string()
    .trim()
    .min(15, "Paste your calendar or list your meetings first.")
    .max(10000),
  priorities: z.string().max(4000).optional().default(""),
  window: z.enum(["today", "week"]),
});
export type GuardrailsInput = z.infer<typeof guardrailsInputSchema>;

const guardrailsOutputSchema = z.object({
  healthScore: z.number().min(0).max(100),
  healthVerdict: z.string(),
  findings: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      severity: z.enum(["critical", "warning", "healthy"]),
    }),
  ),
  protectedBlocks: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      title: z.string(),
      kind: z.enum(["focus", "prep", "buffer", "recovery"]),
      reason: z.string(),
    }),
  ),
  recommendations: z.array(z.string()),
});

export const stakeholderInputSchema = z.object({
  name: z.string().trim().min(2, "Add the stakeholder's name.").max(120),
  role: z.string().max(160).optional().default(""),
  lastContact: z.string().max(60).optional().default(""),
  notes: z
    .string()
    .trim()
    .min(20, "Paste the interaction history or recent notes.")
    .max(10000),
  tone: z.enum(["warm", "urgent", "board-update", "reconnect"]),
});
export type StakeholderInput = z.infer<typeof stakeholderInputSchema>;

const stakeholderOutputSchema = z.object({
  sentiment: z.enum(["Positive", "Neutral", "At Risk"]),
  sentimentScore: z.number().min(0).max(100),
  summary: z.string(),
  positiveSignals: z.array(z.string()),
  riskSignals: z.array(z.string()),
  recommendedTiming: z.string(),
  talkingPoints: z.array(z.string()),
  followUpEmail: z.object({ subject: z.string(), body: z.string() }),
});

export async function runGuardrailsGeneration(
  input: GuardrailsInput,
  apiKey?: string,
): Promise<AiResult<CalendarGuardrails>> {
  if (!apiKey) return { data: mockGuardrails(input), source: "mock" };
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const output = await generateStructured<CalendarGuardrails>({
      model: gateway(MODEL),
      schema: guardrailsOutputSchema,
      shape:
        '{"healthScore": number, "healthVerdict": string, "findings": [{"title": string, "detail": string, "severity": "critical"|"warning"|"healthy"}], "protectedBlocks": [{"start": string, "end": string, "title": string, "kind": "focus"|"prep"|"buffer"|"recovery", "reason": string}], "recommendations": string[]}',
      system:
        "You are ExecPulse AI, a chief-of-staff auditing a CEO's calendar. " +
        "Detect back-to-back meeting chains, missing prep time before high-stakes sessions, " +
        "meeting overload, fragmented focus time, and missing recovery buffers. " +
        "healthScore is 0-100 (100 = perfectly protected). Give 3-6 findings, " +
        "3-6 protected blocks that fit in real gaps, and 3-5 crisp recommendations. " +
        "Never invent meetings that were not provided.",
      prompt:
        `PLANNING WINDOW: ${input.window === "today" ? "Today" : "This week"}\n\n` +
        `CALENDAR / MEETINGS:\n${input.schedule}\n\n` +
        (input.priorities.trim()
          ? `STRATEGIC PRIORITIES TO PROTECT:\n${input.priorities}\n\n`
          : "") +
        "Audit this calendar and return the guardrails using the schema above.",
    });
    return { data: output, source: "ai" };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

export async function runStakeholderGeneration(
  input: StakeholderInput,
  apiKey?: string,
): Promise<AiResult<StakeholderInsight>> {
  if (!apiKey) return { data: mockStakeholder(input), source: "mock" };
  try {
    const gateway = createLovableAiGatewayProvider(apiKey);
    const output = await generateStructured<StakeholderInsight>({
      model: gateway(MODEL),
      schema: stakeholderOutputSchema,
      shape:
        '{"sentiment": "Positive"|"Neutral"|"At Risk", "sentimentScore": number, "summary": string, "positiveSignals": string[], "riskSignals": string[], "recommendedTiming": string, "talkingPoints": string[], "followUpEmail": {"subject": string, "body": string}}',
      system:
        "You are ExecPulse AI, a relationship strategist for a Fortune-500 CEO. " +
        "Read the interaction history, judge the relationship's sentiment honestly, " +
        "and draft a follow-up email in the requested tone. sentimentScore is 0-100 " +
        "(100 = strongly positive). Be specific and evidence-based; never invent " +
        "financial figures or commitments. Sign the email as 'The Executive Office'.",
      prompt:
        `STAKEHOLDER: ${input.name}${input.role ? ` — ${input.role}` : ""}\n` +
        (input.lastContact ? `LAST CONTACT: ${input.lastContact}\n` : "") +
        `FOLLOW-UP TONE: ${FOLLOWUP_TONE_LABELS[input.tone]}\n\n` +
        `INTERACTION HISTORY / NOTES:\n${input.notes}\n\n` +
        "Analyze the relationship and draft the follow-up using the schema above.",
    });
    return { data: output, source: "ai" };
  } catch (err) {
    throw toFriendlyError(err);
  }
}

function mockGuardrails(input: GuardrailsInput): CalendarGuardrails {
  const lines = input.schedule
    .split("\n")
    .map((l) => l.trim().replace(/^[-*•\d.\s]+/, ""))
    .filter((l) => l.length > 2);
  const first = lines[0] ?? "your first meeting";
  const busiest = lines[1] ?? "your leadership review";
  const week = input.window === "week";
  return {
    healthScore: 62,
    healthVerdict:
      "Your calendar is meeting-heavy with limited protected thinking time. Two structural fixes recover roughly three hours of strategic capacity.",
    findings: [
      {
        title: "Back-to-back chain detected",
        detail: `“${first}” runs straight into the next session with no reset time. Decision quality drops measurably after the second consecutive meeting.`,
        severity: "critical",
      },
      {
        title: "No prep time before a high-stakes session",
        detail: `“${busiest.slice(0, 70)}” has no dedicated preparation window ahead of it. Book 30 minutes so you walk in with a position, not a reaction.`,
        severity: "critical",
      },
      {
        title: "Focus time is fragmented",
        detail: `Your open time appears in blocks shorter than 45 minutes${week ? " across most days" : ""}, which is below the threshold for meaningful strategic work.`,
        severity: "warning",
      },
      {
        title: "Recovery buffers are healthy late in the day",
        detail: "The end of your schedule leaves room to capture follow-ups and close the loop on decisions.",
        severity: "healthy",
      },
    ],
    protectedBlocks: week
      ? [
          { start: "Mon 08:30", end: "Mon 10:30", title: "Protected strategic focus", kind: "focus", reason: "Front-load the week's highest-leverage work while energy is highest." },
          { start: "Tue 09:30", end: "Tue 10:00", title: "Prep: leadership review", kind: "prep", reason: "Arrive with a written position and the two decisions you need." },
          { start: "Wed 12:00", end: "Wed 12:30", title: "Reset buffer", kind: "buffer", reason: "Breaks the mid-week back-to-back chain." },
          { start: "Fri 15:00", end: "Fri 16:00", title: "Week close & recovery", kind: "recovery", reason: "Capture follow-ups and set next week's top three." },
        ]
      : [
          { start: "08:30", end: "10:00", title: "Protected strategic focus", kind: "focus", reason: "Your only uninterrupted window — reserve it for the highest-stakes decision." },
          { start: "10:30", end: "11:00", title: `Prep: ${busiest.slice(0, 40)}`, kind: "prep", reason: "Thirty minutes of preparation before a high-stakes session." },
          { start: "13:00", end: "13:15", title: "Reset buffer", kind: "buffer", reason: "Breaks the back-to-back chain after lunch." },
          { start: "16:30", end: "17:00", title: "Day close & recovery", kind: "recovery", reason: "Capture actions and hand off follow-ups before logging off." },
        ],
    recommendations: [
      "Cap consecutive meetings at two, then enforce a 15-minute reset.",
      "Attach a 30-minute prep block to every board-, investor-, or press-facing session.",
      "Declare one recurring no-meeting focus window and defend it publicly.",
      "Delegate or decline any session where you are not the decision-maker.",
    ],
  };
}

function mockStakeholder(input: StakeholderInput): StakeholderInsight {
  const theme = firstLine(input.notes, "the current engagement");
  const atRisk = input.tone === "urgent" || input.tone === "reconnect";
  const subjects: Record<string, string> = {
    warm: `Checking in — ${theme.slice(0, 50)}`,
    urgent: `Time-sensitive: ${theme.slice(0, 50)}`,
    "board-update": `Executive update — ${theme.slice(0, 50)}`,
    reconnect: `Reconnecting on ${theme.slice(0, 50)}`,
  };
  return {
    sentiment: atRisk ? "At Risk" : "Positive",
    sentimentScore: atRisk ? 38 : 74,
    summary: atRisk
      ? `The relationship with ${input.name} has cooled. Engagement signals are weakening around ${theme.slice(0, 60)}, and the gap since your last substantive exchange is now the primary risk. A direct, high-value touchpoint from you personally is warranted this week.`
      : `The relationship with ${input.name} is constructive and forward-leaning. Momentum around ${theme.slice(0, 60)} is intact, and the main opportunity is to convert goodwill into a concrete next commitment.`,
    positiveSignals: atRisk
      ? [
          "Historic goodwill remains — earlier exchanges were substantive and candid.",
          "No explicit objection has been raised; the issue is attention, not alignment.",
        ]
      : [
          "Responses are timely and substantive, indicating genuine investment.",
          "They have voluntarily surfaced ideas and introductions.",
          "Tone in recent exchanges is collaborative rather than transactional.",
        ],
    riskSignals: atRisk
      ? [
          `Time since last meaningful contact${input.lastContact ? ` (${input.lastContact})` : ""} exceeds the healthy cadence for this relationship tier.`,
          "Recent replies are shorter and delegated rather than personal.",
          "No forward commitment is currently on the calendar.",
        ]
      : [
          "No date is set for the next touchpoint — momentum can quietly lapse.",
          "One open question from the last exchange remains unanswered.",
        ],
    recommendedTiming: atRisk
      ? "Send within 24 hours, and propose two specific times in the next 10 days."
      : "Send within the next 3 business days while the last conversation is still current.",
    talkingPoints: [
      `Acknowledge ${theme.slice(0, 60)} directly and where it now stands.`,
      "Lead with what changed since the last exchange, not with an apology.",
      "Offer one concrete piece of value: data, an introduction, or early access.",
      "Close with a specific ask and two proposed times.",
    ],
    followUpEmail: {
      subject: subjects[input.tone] ?? `Following up — ${theme.slice(0, 50)}`,
      body:
        `Dear ${input.name},\n\n` +
        (atRisk
          ? `It has been longer than I would like since we last spoke properly, and I did not want more time to pass without reaching out directly.\n\n`
          : `Thank you again for the last conversation — it sharpened our thinking considerably.\n\n`) +
        `Since then, our work on ${theme.slice(0, 70)} has moved forward, and I think there is a natural next step worth discussing with you specifically.\n\n` +
        `Would either of the next two weeks work for a short conversation? I am happy to work around your schedule, and my office can send options immediately.\n\n` +
        `With appreciation,\nThe Executive Office`,
    },
  };
}
