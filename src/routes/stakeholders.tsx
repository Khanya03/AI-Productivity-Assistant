import { createFileRoute } from "@tanstack/react-router";
import {
  HeartHandshake,
  Mail,
  Clock3,
  ThumbsUp,
  AlertTriangle,
  MessageSquareQuote,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { generateStakeholderInsight } from "@/lib/ai.functions";
import {
  FOLLOWUP_TONE_LABELS,
  type AiResult,
  type FollowUpTone,
  type SentimentLabel,
  type StakeholderInsight,
} from "@/lib/exec-types";

export const Route = createFileRoute("/stakeholders")({
  head: () => ({
    meta: [
      { title: "Stakeholder Sentiment & Follow-ups — ExecPulse AI" },
      {
        name: "description",
        content:
          "Analyze stakeholder relationship sentiment from your interaction history and get an AI-drafted follow-up email in the tone you choose.",
      },
      {
        property: "og:title",
        content: "Stakeholder Sentiment & Follow-ups — ExecPulse AI",
      },
      {
        property: "og:description",
        content:
          "Executive relationship intelligence: sentiment scoring, risk signals, talking points, and a ready-to-send follow-up email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StakeholdersPage,
});

const sentimentBadge: Record<
  SentimentLabel,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Positive: "default",
  Neutral: "secondary",
  "At Risk": "destructive",
};

function insightToText(i: StakeholderInsight): string {
  return [
    `SENTIMENT: ${i.sentiment} (${i.sentimentScore}/100)`,
    i.summary,
    "",
    "POSITIVE SIGNALS",
    ...i.positiveSignals.map((s) => `• ${s}`),
    "",
    "RISK SIGNALS",
    ...i.riskSignals.map((s) => `• ${s}`),
    "",
    `RECOMMENDED TIMING: ${i.recommendedTiming}`,
    "",
    "TALKING POINTS",
    ...i.talkingPoints.map((s) => `• ${s}`),
    "",
    `SUBJECT: ${i.followUpEmail.subject}`,
    "",
    i.followUpEmail.body,
  ].join("\n");
}

function StakeholdersPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [lastContact, setLastContact] = useState("");
  const [notes, setNotes] = useState("");
  const [tone, setTone] = useState<FollowUpTone>("warm");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult<StakeholderInsight> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateStakeholderInsight({
        data: { name, role, lastContact, notes, tone },
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
        icon={HeartHandshake}
        title="Stakeholder Sentiment & Follow-ups"
        description="Read the temperature of a key relationship and get a follow-up email calibrated to the moment."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card className="h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Stakeholder</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Amara Ndlovu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role / Organization</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Lead investor, Meridian Capital"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="last-contact">Last Contact</Label>
                <Input
                  id="last-contact"
                  value={lastContact}
                  onChange={(e) => setLastContact(e.target.value)}
                  placeholder="6 weeks ago"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tone">Follow-up Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(v) => setTone(v as FollowUpTone)}
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(FOLLOWUP_TONE_LABELS) as FollowUpTone[]
                    ).map((t) => (
                      <SelectItem key={t} value={t}>
                        {FOLLOWUP_TONE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Interaction History / Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={12}
                placeholder={
                  "Paste emails, call notes, or meeting recaps…\n\nQ2 board call: pushed hard on burn rate\nEmail 12 Aug: no reply to the expansion memo\nDinner in May: very supportive of the APAC plan"
                }
                className="resize-y font-mono text-xs leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">
                The more history you paste, the sharper the sentiment read.
              </p>
            </div>

            <GenerateButton
              loading={loading}
              disabled={name.trim().length < 2 || notes.trim().length < 20}
              onClick={generate}
              label="Analyze Relationship"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading && <OutputLoadingState label="Reading the relationship…" />}
          {!loading && error && <OutputError message={error} onRetry={generate} />}
          {!loading && !error && !result && (
            <OutputEmptyState message="Add a stakeholder and their interaction history to get a sentiment read, talking points, and a drafted follow-up." />
          )}

          {!loading && !error && result && (
            <>
              <OutputActions
                source={result.source}
                onRegenerate={generate}
                loading={loading}
                copyText={() => insightToText(result.data)}
              />

              <Card>
                <CardContent className="space-y-4 py-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={sentimentBadge[result.data.sentiment]}>
                      {result.data.sentiment}
                    </Badge>
                    <span className="font-display text-2xl font-bold tracking-tight text-foreground">
                      {result.data.sentimentScore}
                      <span className="text-base text-muted-foreground">
                        /100
                      </span>
                    </span>
                  </div>
                  <Progress value={result.data.sentimentScore} />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {result.data.summary}
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    <span>{result.data.recommendedTiming}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                {result.data.positiveSignals.length > 0 && (
                  <SectionCard
                    title="Positive Signals"
                    action={<ThumbsUp className="h-4 w-4 text-success" />}
                  >
                    <ul className="space-y-2 text-sm">
                      {result.data.positiveSignals.map((s, i) => (
                        <li key={i} className="text-foreground">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
                {result.data.riskSignals.length > 0 && (
                  <SectionCard
                    title="Risk Signals"
                    action={
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    }
                  >
                    <ul className="space-y-2 text-sm">
                      {result.data.riskSignals.map((s, i) => (
                        <li key={i} className="text-foreground">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </SectionCard>
                )}
              </div>

              {result.data.talkingPoints.length > 0 && (
                <SectionCard
                  title="Talking Points"
                  action={
                    <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
                  }
                >
                  <ul className="space-y-2 text-sm">
                    {result.data.talkingPoints.map((s, i) => (
                      <li key={i} className="text-foreground">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              <SectionCard
                title="Drafted Follow-up"
                action={<Mail className="h-4 w-4 text-muted-foreground" />}
              >
                <p className="text-sm font-semibold text-foreground">
                  {result.data.followUpEmail.subject}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {result.data.followUpEmail.body}
                </p>
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
