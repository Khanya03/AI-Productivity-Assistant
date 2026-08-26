import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ListOrdered,
  Newspaper,
  Send,
  Target,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GenerateButton,
  ModulePageHeader,
  OutputActions,
  OutputEmptyState,
  OutputError,
  OutputLoadingState,
  SectionCard,
} from "@/components/module-shell";
import { generateDailyBrief } from "@/lib/ai.functions";
import type { AiResult, DailyBrief } from "@/lib/exec-types";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Executive Daily Brief — ExecPulse AI" },
      {
        name: "description",
        content:
          "Generate a one-page morning brief for CEOs: ranked priorities, pending decisions, stakeholder updates, market snapshot, and a proposed schedule.",
      },
      { property: "og:title", content: "Executive Daily Brief — ExecPulse AI" },
      {
        property: "og:description",
        content:
          "Your morning command brief: top priorities, decisions, stakeholder updates, market intelligence, and time blocks — synthesized by AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyBriefPage,
});

const urgencyVariant: Record<string, "default" | "secondary" | "outline"> = {
  High: "default",
  Medium: "secondary",
  Low: "outline",
};

function dailyBriefToText(d: DailyBrief): string {
  return [
    d.headline,
    "",
    "TOP PRIORITIES",
    ...d.topPriorities.map(
      (p) => `${p.rank}. ${p.task}\n   Why: ${p.why}`,
    ),
    "",
    "DECISIONS PENDING",
    ...d.decisionsPending.map((dec) => `• ${dec}`),
    "",
    "STAKEHOLDER UPDATES",
    ...d.stakeholderUpdates.map(
      (u) => `• [${u.urgency}] ${u.audience}: ${u.message}`,
    ),
    "",
    "MARKET SNAPSHOT",
    ...d.marketSnapshot.map((m) => `• ${m}`),
    "",
    "PROPOSED SCHEDULE",
    ...d.scheduleBlocks.map(
      (b) => `${b.start}–${b.end}  ${b.title}\n   ${b.note}`,
    ),
    "",
    d.closingNote,
  ].join("\n");
}

function DailyBriefPage() {
  const [context, setContext] = useState("");
  const [meetings, setMeetings] = useState("");
  const [market, setMarket] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult<DailyBrief> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateDailyBrief({
        data: { context, meetings, market },
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <ModulePageHeader
        icon={Newspaper}
        title="Executive Daily Brief"
        description="Morning command brief — synthesize context, meetings, and market intel into a one-page executive plan."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Inputs */}
        <Card className="h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="context">
                Executive Context & Today's Priorities
              </Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={
                  "What's on your plate today? e.g.\n- Close Q3 budget review\n- Respond to board question on hiring\n- Prep all-hands talking points"
                }
                className="min-h-36 resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Required — this is the backbone of your brief.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetings">
                Upcoming Meetings / Recent Notes
              </Label>
              <Textarea
                id="meetings"
                value={meetings}
                onChange={(e) => setMeetings(e.target.value)}
                placeholder={
                  "Paste meeting agendas, transcripts, or notes from yesterday."
                }
                className="min-h-28 resize-y"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market">
                Market & Competitive Intel
              </Label>
              <Textarea
                id="market"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                placeholder={
                  "Paste a competitor headline, article snippet, or analyst note."
                }
                className="min-h-28 resize-y"
              />
            </div>

            <GenerateButton
              loading={loading}
              disabled={context.trim().length < 20}
              onClick={generate}
              label="Generate Morning Brief"
            />
          </CardContent>
        </Card>

        {/* Output */}
        <div className="space-y-4">
          {loading ? (
            <OutputLoadingState label="Synthesizing your morning brief…" />
          ) : error ? (
            <OutputError message={error} onRetry={generate} />
          ) : !result ? (
            <OutputEmptyState message="Your one-page morning brief — priorities, decisions, stakeholder updates, market snapshot, and schedule — will appear here." />
          ) : (
            <>
              <OutputActions
                source={result.source}
                onRegenerate={generate}
                loading={loading}
                copyText={() => dailyBriefToText(result.data)}
              />

              <Card className="border-primary/30 bg-primary/[0.03]">
                <CardContent className="space-y-3 py-5">
                  <h2 className="text-sm font-bold tracking-tight text-foreground">
                    {result.data.headline}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    AI-generated morning brief — review before sharing.
                  </p>
                </CardContent>
              </Card>

              <SectionCard
                title="Top Priorities"
                action={
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                }
              >
                <ol className="space-y-3">
                  {result.data.topPriorities
                    .sort((a, b) => a.rank - b.rank)
                    .map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border bg-card p-3"
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {p.rank}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            {p.task}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.why}
                          </p>
                        </div>
                      </li>
                    ))}
                </ol>
              </SectionCard>

              {result.data.decisionsPending.length > 0 && (
                <SectionCard title="Decisions Pending">
                  <ul className="space-y-2.5">
                    {result.data.decisionsPending.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <span className="text-foreground">{d}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {result.data.stakeholderUpdates.length > 0 && (
                <SectionCard
                  title="Stakeholder Updates"
                  action={
                    <Send className="h-4 w-4 text-muted-foreground" />
                  }
                >
                  <ul className="space-y-3">
                    {result.data.stakeholderUpdates.map((u, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border bg-card p-3"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-[11px]">
                              {u.audience}
                            </Badge>
                            <Badge
                              variant={urgencyVariant[u.urgency] ?? "outline"}
                              className="text-[11px]"
                            >
                              {u.urgency} urgency
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-sm text-foreground">
                            {u.message}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {result.data.marketSnapshot.length > 0 && (
                <SectionCard
                  title="Market Snapshot"
                  action={
                    <Target className="h-4 w-4 text-muted-foreground" />
                  }
                >
                  <ul className="space-y-2.5">
                    {result.data.marketSnapshot.map((m, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span className="text-foreground">{m}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {result.data.scheduleBlocks.length > 0 && (
                <Card>
                  <CardContent className="space-y-1 py-5">
                    <h3 className="mb-3 text-sm font-bold tracking-tight text-foreground">
                      Proposed Schedule
                    </h3>
                    <ol className="relative space-y-3 border-l-2 border-border pl-5">
                      {result.data.scheduleBlocks.map((b, i) => (
                        <li key={i} className="relative">
                          <span
                            className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary"
                            aria-hidden
                          />
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {b.start} – {b.end}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {b.title}
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {b.note}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}

              <Card className="border-dashed">
                <CardContent className="py-5">
                  <p className="text-sm font-medium italic text-foreground">
                    “{result.data.closingNote}”
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
