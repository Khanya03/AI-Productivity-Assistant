import { createFileRoute } from "@tanstack/react-router";
import { Globe2, Lightbulb, Target } from "lucide-react";
import { useState } from "react";

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
import { generateMarketBrief } from "@/lib/ai.functions";
import type { AiResult, MarketBrief } from "@/lib/exec-types";

export const Route = createFileRoute("/briefs")({
  head: () => ({
    meta: [
      { title: "Market & Competitor Briefs — ExecPulse AI" },
      {
        name: "description",
        content:
          "AI research assistant for executives: get a 3-bullet TL;DR, key strategic insights, and actionable takeaways on any market topic or article.",
      },
      {
        property: "og:title",
        content: "Market & Competitor Briefs — ExecPulse AI",
      },
      {
        property: "og:description",
        content:
          "Executive-grade market and competitor intelligence: TL;DR, strategic insights, and recommended actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BriefsPage,
});

function briefToText(b: MarketBrief): string {
  return [
    `EXECUTIVE TL;DR\n${b.tldr.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
    `KEY STRATEGIC INSIGHTS\n${b.insights.map((i) => `• ${i}`).join("\n")}`,
    `RECOMMENDED TAKEAWAYS\n${b.takeaways.map((t) => `• ${t}`).join("\n")}`,
  ].join("\n\n");
}

function BriefsPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult<MarketBrief> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateMarketBrief({ data: { topic } });
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
        icon={Globe2}
        title="Market & Competitor Briefs"
        description="AI research assistant — executive-grade intelligence on any topic, article, or industry report."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Inputs */}
        <Card className="h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="topic">
                Topic, Article Text, or Report Request
              </Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  "e.g. 'Brief me on the competitive landscape for AI-powered CRM platforms' — or paste article text for analysis."
                }
                className="min-h-52 resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Paste full article text for a grounded analysis, or name a topic
                for a landscape brief.
              </p>
            </div>

            <GenerateButton
              loading={loading}
              disabled={topic.trim().length < 5}
              onClick={generate}
              label="Generate Market Brief"
            />
          </CardContent>
        </Card>

        {/* Output */}
        <div className="space-y-4">
          {loading ? (
            <OutputLoadingState label="Researching and distilling your brief…" />
          ) : error ? (
            <OutputError message={error} onRetry={generate} />
          ) : !result ? (
            <OutputEmptyState message="Your executive brief — a 3-bullet TL;DR, strategic insights, and recommended takeaways — will appear here." />
          ) : (
            <>
              <OutputActions
                source={result.source}
                onRegenerate={generate}
                loading={loading}
                copyText={() => briefToText(result.data)}
              />

              <Card className="border-primary/30 bg-primary/[0.03]">
                <CardContent className="space-y-3 py-5">
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Executive TL;DR
                  </h3>
                  <ol className="space-y-2.5">
                    {result.data.tldr.map((t, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium leading-relaxed text-foreground">
                          {t}
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <SectionCard title="Key Strategic Insights">
                <ul className="space-y-2.5">
                  {result.data.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <span className="text-foreground">{insight}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Recommended Actionable Takeaways">
                <ul className="space-y-2.5">
                  {result.data.takeaways.map((t, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground">{t}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
