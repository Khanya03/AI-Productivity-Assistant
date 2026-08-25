import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Clock } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { generatePlan } from "@/lib/ai.functions";
import type {
  AiResult,
  BlockCategory,
  PlanResult,
  PlanningWindow,
} from "@/lib/exec-types";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Strategic Planner — ExecPulse AI" },
      {
        name: "description",
        content:
          "Turn an unstructured to-do list into a time-blocked executive schedule, prioritized by urgency and strategic importance.",
      },
      { property: "og:title", content: "Strategic Planner — ExecPulse AI" },
      {
        property: "og:description",
        content:
          "AI task planner for CEOs: focus blocks, buffers, and meeting batches for today or the whole week.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerPage,
});

const categoryStyles: Record<BlockCategory, { label: string; className: string }> = {
  focus: { label: "Focus", className: "bg-primary/10 text-primary" },
  meeting: { label: "Meeting", className: "bg-secondary text-secondary-foreground" },
  buffer: { label: "Buffer", className: "bg-muted text-muted-foreground" },
  admin: { label: "Admin", className: "bg-accent text-accent-foreground" },
  strategic: { label: "Strategic", className: "bg-success/15 text-success" },
};

function planToText(plan: PlanResult): string {
  return [
    `SCHEDULE OVERVIEW\n${plan.overview}`,
    ...plan.blocks.map(
      (b) => `${b.start}–${b.end}  [${b.category.toUpperCase()}] ${b.title}\n   ${b.note}`,
    ),
  ].join("\n\n");
}

function PlannerPage() {
  const [tasks, setTasks] = useState("");
  const [window_, setWindow] = useState<PlanningWindow>("today");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult<PlanResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generatePlan({ data: { tasks, window: window_ } });
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
        icon={CalendarClock}
        title="Strategic Planner"
        description="AI task planner — time-block your day or week by urgency and strategic importance."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Inputs */}
        <Card className="h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="tasks">Unstructured Task List / To-Dos</Label>
              <Textarea
                id="tasks"
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
                placeholder={
                  "Dump everything on your mind, e.g.\nReview board pre-read, call lead investor, approve Q3 budget, prep all-hands talk, 1:1 with CTO, answer press inquiry…"
                }
                className="min-h-52 resize-y"
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-foreground">
                Planning Window
              </legend>
              <RadioGroup
                value={window_}
                onValueChange={(v) => setWindow(v as PlanningWindow)}
                className="flex flex-col gap-2 sm:flex-row sm:gap-6"
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <RadioGroupItem value="today" id="win-today" />
                  Today's Schedule
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <RadioGroupItem value="week" id="win-week" />
                  Weekly Overview
                </label>
              </RadioGroup>
            </fieldset>

            <GenerateButton
              loading={loading}
              disabled={tasks.trim().length < 5}
              onClick={generate}
              label="Build My Schedule"
            />
          </CardContent>
        </Card>

        {/* Output */}
        <div className="space-y-4">
          {loading ? (
            <OutputLoadingState label="Prioritizing and time-blocking your schedule…" />
          ) : error ? (
            <OutputError message={error} onRetry={generate} />
          ) : !result ? (
            <OutputEmptyState message="Your prioritized, time-blocked schedule — with focus blocks and buffer times — will appear here." />
          ) : (
            <>
              <OutputActions
                source={result.source}
                onRegenerate={generate}
                loading={loading}
                copyText={() => planToText(result.data)}
              />

              <SectionCard title="Planning Rationale">
                <p className="text-sm leading-relaxed text-foreground">
                  {result.data.overview}
                </p>
              </SectionCard>

              <Card>
                <CardContent className="space-y-1 py-5">
                  <h3 className="mb-3 text-sm font-bold tracking-tight text-foreground">
                    Time-Blocked Schedule
                  </h3>
                  <ol className="relative space-y-3 border-l-2 border-border pl-5">
                    {result.data.blocks.map((b, i) => {
                      const style = categoryStyles[b.category] ?? categoryStyles.admin;
                      return (
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
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}
                            >
                              {style.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {b.title}
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {b.note}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
