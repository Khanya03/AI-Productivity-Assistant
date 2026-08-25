import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, ListChecks, NotebookPen } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { generateBriefing } from "@/lib/ai.functions";
import type {
  AiResult,
  BriefingFocus,
  BriefingResult,
} from "@/lib/exec-types";

export const Route = createFileRoute("/briefing")({
  head: () => ({
    meta: [
      { title: "Executive Briefing — ExecPulse AI" },
      {
        name: "description",
        content:
          "Summarize raw meeting notes into a structured executive briefing: key decisions, action items with owners, and risk factors.",
      },
      { property: "og:title", content: "Executive Briefing — ExecPulse AI" },
      {
        property: "og:description",
        content:
          "Paste a transcript or rough notes and get a chief-of-staff grade executive briefing in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BriefingPage,
});

const focusOptions: { key: keyof BriefingFocus; label: string }[] = [
  { key: "decisions", label: "Key Decisions" },
  { key: "actions", label: "Action Items" },
  { key: "risks", label: "Risk Factors" },
];

const priorityVariant: Record<string, "default" | "secondary" | "outline"> = {
  High: "default",
  Medium: "secondary",
  Low: "outline",
};

function briefingToText(b: BriefingResult, focus: BriefingFocus): string {
  const parts = [`EXECUTIVE SUMMARY\n${b.executiveSummary}`];
  if (focus.decisions && b.keyDecisions.length)
    parts.push(
      `KEY DECISIONS\n${b.keyDecisions.map((d) => `• ${d}`).join("\n")}`,
    );
  if (focus.actions && b.actionItems.length)
    parts.push(
      `ACTION ITEMS\n${b.actionItems
        .map((a) => `• [${a.priority}] ${a.task} — ${a.owner}`)
        .join("\n")}`,
    );
  if (focus.risks && b.riskFactors.length)
    parts.push(
      `RISK FACTORS\n${b.riskFactors.map((r) => `• ${r}`).join("\n")}`,
    );
  return parts.join("\n\n");
}

function BriefingPage() {
  const [notes, setNotes] = useState("");
  const [focus, setFocus] = useState<BriefingFocus>({
    decisions: true,
    actions: true,
    risks: true,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult<BriefingResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateBriefing({ data: { notes, focus } });
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
        icon={NotebookPen}
        title="Executive Briefing"
        description="Meeting notes summarizer — convert raw transcripts into a structured, decision-oriented briefing."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Inputs */}
        <Card className="h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="notes">Raw Meeting Notes / Transcript</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste raw notes or a transcript here — messy is fine."
                className="min-h-64 resize-y"
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                Summary Focus
              </legend>
              <div className="flex flex-wrap gap-4">
                {focusOptions.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
                  >
                    <Checkbox
                      checked={focus[opt.key]}
                      onCheckedChange={(checked) =>
                        setFocus((f) => ({ ...f, [opt.key]: checked === true }))
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <GenerateButton
              loading={loading}
              disabled={notes.trim().length < 20}
              onClick={generate}
              label="Generate Executive Briefing"
            />
          </CardContent>
        </Card>

        {/* Output */}
        <div className="space-y-4">
          {loading ? (
            <OutputLoadingState label="Analyzing notes and structuring your briefing…" />
          ) : error ? (
            <OutputError message={error} onRetry={generate} />
          ) : !result ? (
            <OutputEmptyState message="Your structured executive briefing — summary, key decisions, action items, and risks — will appear here as clean sections." />
          ) : (
            <>
              <OutputActions
                source={result.source}
                onRegenerate={generate}
                loading={loading}
                copyText={() => briefingToText(result.data, focus)}
              />

              <SectionCard title="Executive Summary">
                <p className="text-sm leading-relaxed text-foreground">
                  {result.data.executiveSummary}
                </p>
              </SectionCard>

              {focus.decisions && result.data.keyDecisions.length > 0 && (
                <SectionCard title="Key Decisions">
                  <ul className="space-y-2.5">
                    {result.data.keyDecisions.map((d, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-foreground">{d}</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {focus.actions && result.data.actionItems.length > 0 && (
                <SectionCard title="Action Items">
                  <ul className="space-y-3">
                    {result.data.actionItems.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border bg-card p-3"
                      >
                        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {a.task}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-[11px]">
                              {a.owner}
                            </Badge>
                            <Badge
                              variant={priorityVariant[a.priority] ?? "outline"}
                              className="text-[11px]"
                            >
                              {a.priority} priority
                            </Badge>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {focus.risks && result.data.riskFactors.length > 0 && (
                <SectionCard title="Risk Factors">
                  <ul className="space-y-2.5">
                    {result.data.riskFactors.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
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
