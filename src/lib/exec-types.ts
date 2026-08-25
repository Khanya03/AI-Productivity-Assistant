// Shared, client-safe types and constants for ExecPulse AI modules.

export type EmailRecipient = "board" | "investors" | "all-hands" | "partners";
export type EmailTone = "formal" | "concise" | "motivating" | "firm";

export const RECIPIENT_LABELS: Record<EmailRecipient, string> = {
  board: "Board of Directors",
  investors: "Investors",
  "all-hands": "All-Hands / Internal Team",
  partners: "External Partners",
};

export const TONE_LABELS: Record<EmailTone, string> = {
  formal: "Formal Executive",
  concise: "Direct & Concise",
  motivating: "Motivating",
  firm: "Firm / Strategic",
};

export interface ExecEmail {
  subject: string;
  body: string;
}

export interface ActionItem {
  task: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
}

export interface BriefingResult {
  executiveSummary: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  riskFactors: string[];
}

export type BriefingFocus = {
  decisions: boolean;
  actions: boolean;
  risks: boolean;
};

export type PlanningWindow = "today" | "week";

export type BlockCategory = "focus" | "meeting" | "buffer" | "admin" | "strategic";

export interface TimeBlock {
  start: string;
  end: string;
  title: string;
  category: BlockCategory;
  note: string;
}

export interface PlanResult {
  overview: string;
  blocks: TimeBlock[];
}

export interface MarketBrief {
  tldr: string[];
  insights: string[];
  takeaways: string[];
}

export type AiSource = "ai" | "mock";

export interface AiResult<T> {
  data: T;
  source: AiSource;
}
