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
  type DailyBriefInput,
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
