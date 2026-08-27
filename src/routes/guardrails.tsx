import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { generateGuardrails } from "@/lib/ai.functions";
import type {
  AiResult,
  CalendarGuardrails,
  GuardrailBlockKind,
  GuardrailSeverity,
} from "@/lib/exec-types";

export const Route = createFileRoute("/guardrails")({
  head: () => ({
    meta: [
      { title: "Executive Calendar Guardrails — ExecPulse AI" },
      {
        name: "description",
        content:
          "Audit a CEO calendar for back-to-back meetings, missing prep time, and fragmented focus — and get protected focus, prep, and recovery blocks.",
      },
      {
        property: "og:title",
        content: "Executive Calendar Guardrails — ExecPulse AI",
      },
      {
        property: "og:description",
        content:
          "AI calendar audit for executives: schedule health score, conflict findings, and protected focus and prep blocks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuardrailsPage,
});

const severityStyles: Record<
  GuardrailSeverity,
  { badge: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  critical: { badge: "destructive", label: "Critical" },
  warning: { badge: "secondary", label: "Watch" },
  healthy: { badge: "outline", label: "Healthy" },
};

const kindLabels: Record<GuardrailBlockKind, string> = {
  focus: "Focus",
  prep: "Prep",
  buffer: "Buffer",
  recovery: "Recovery",
};

function guardrailsToText(g: CalendarGuardrails): string {
  return [
    `CALENDAR HEALTH: ${g.healthScore}/100`,
    g.healthVerdict,
    "",
    "FINDINGS",
    ...g.findings.map(
      (f) => `• [${severityStyles[f.severity].label}] ${f.title}\n  ${f.detail}`,
    ),
    "",
    "PROTECTED BLOCKS",
    ...g.protectedBlocks.map(
      (b) =>
        `${b.start}–${b.end}  ${b.title} (${kindLabels[b.kind]})\n   ${b.reason}`,
    ),
    "",
    "RECOMMENDATIONS",
    ...g.recommendations.map((r) => `• ${r}`),
  ].join("\n");
}

function GuardrailsPage() {
  const [schedule, setSchedule] = useState("");
  const [priorities, setPriorities] = useState("");
  const [window, setWindow] = useState<"today" | "week">("today");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult<CalendarGuardrails> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateGuardrails({
        data: { schedule, priorities, window },
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
        icon={ShieldCheck}
        title="Executive Calendar Guardrails"
        description="Audit your calendar for back-to-back chains, missing prep, and fragmented focus — then protect the time that matters."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="window">Planning Window</Label>
              <Select
                value={window}
                onValueChange={(v) => setWindow(v as "today" | "week")}
              >
                <SelectTrigger id="window">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Calendar / Meetings</Label>
              <Textarea
                id="schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder={
                  "Paste your agenda, one meeting per line. e.g.\n09:00–10:00 Exec team weekly\n10:00–11:00 Investor call — Series C\n11:00–12:30 Product review"
                }
                className="min-h-40 resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Required — times and titles are enough.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priorities">Strategic Priorities to Protect</Label>
              <Textarea
                id="priorities"
                value={priorities}
                onChange={(e) => setPriorities(e.target.value)}
                placeholder={
                  "What must not get squeezed out? e.g. board narrative, hiring decisions, deep work on pricing."
                }
                className="min-h-28 resize-y"
              />
            </div>

            <GenerateButton
              loading={loading}
              disabled={schedule.trim().length < 15}
              onClick={generate}
              label="Audit My Calendar"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <OutputLoadingState label="Auditing your calendar for conflicts and gaps…" />
          ) : error ? (
            <OutputError message={error} onRetry={generate} />
          ) : !result ? (
            <OutputEmptyState message="Your schedule health score, conflict findings, and protected focus blocks will appear here." />
          ) : (
            <>
              <OutputActions
                source={result.source}
                onRegenerate={generate}
                loading={loading}
                copyText={() => guardrailsToText(result.data)}
              />

              <Card className="border-primary/30 bg-primary/[0.03]">
                <CardContent className="space-y-3 py-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-sm font-bold tracking-tight text-foreground">
                      Calendar Health
                    </h2>
                    <span className="font-display text-2xl font-bold text-primary">
                      {Math.round(result.data.healthScore)}
                      <span className="text-sm text-muted-foreground">/100</span>
                    </span>
                  </div>
                  <Progress value={Math.round(result.data.healthScore)} />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {result.data.healthVerdict}
                  </p>
                </CardContent>
              </Card>

              {result.data.findings.length > 0 && (
                <SectionCard
                  title="Findings"
                  action={
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  }
                >
                  <ul className="space-y-3">
                    {result.data.findings.map((f, i) => (
                      <li key={i} className="rounded-lg border bg-card p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={severityStyles[f.severity].badge}
                            className="text-[11px]"
                          >
                            {severityStyles[f.severity].label}
                          </Badge>
                          <p className="text-sm font-semibold text-foreground">
                            {f.title}
                          </p>
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {f.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {result.data.protectedBlocks.length > 0 && (
                <SectionCard
                  title="Protected Blocks"
                  action={
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  }
                >
                  <ul className="space-y-3">
                    {result.data.protectedBlocks.map((b, i) => (
                      <li
                        key={i}
                        className="flex flex-col gap-1 rounded-lg border bg-card p-3 sm:flex-row sm:items-start sm:gap-4"
                      >
                        <span className="shrink-0 font-mono text-xs font-semibold text-primary sm:w-32">
                          {b.start}–{b.end}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {b.title}
                            </p>
                            <Badge variant="secondary" className="text-[11px]">
                              {kindLabels[b.kind]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {b.reason}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {result.data.recommendations.length > 0 && (
                <SectionCard
                  title="Recommendations"
                  action={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                >
                  <ul className="space-y-2.5">
                    {result.data.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-foreground">{r}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
