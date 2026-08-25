import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/module-shell";
import { generateExecEmail } from "@/lib/ai.functions";
import {
  RECIPIENT_LABELS,
  TONE_LABELS,
  type AiResult,
  type EmailRecipient,
  type EmailTone,
  type ExecEmail,
} from "@/lib/exec-types";

export const Route = createFileRoute("/comms")({
  head: () => ({
    meta: [
      { title: "Stakeholder Comms — ExecPulse AI" },
      {
        name: "description",
        content:
          "Generate polished, tone-calibrated stakeholder emails for boards, investors, teams, and partners from rough bullet points.",
      },
      { property: "og:title", content: "Stakeholder Comms — ExecPulse AI" },
      {
        property: "og:description",
        content:
          "Smart email generator for executives: pick the audience, set the tone, paste your key points, and get a send-ready draft.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommsPage,
});

function CommsPage() {
  const [recipient, setRecipient] = useState<EmailRecipient>("board");
  const [tone, setTone] = useState<EmailTone>("formal");
  const [keyPoints, setKeyPoints] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult<ExecEmail> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setEditing(false);
    try {
      const res = await generateExecEmail({
        data: { recipient, tone, keyPoints },
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (patch: Partial<ExecEmail>) => {
    if (!result) return;
    setResult({ ...result, data: { ...result.data, ...patch } });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <ModulePageHeader
        icon={Send}
        title="Stakeholder Comms"
        description="Smart email generator — turn rough bullet points into polished, tone-calibrated stakeholder updates."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Inputs */}
        <Card className="h-fit">
          <CardContent className="space-y-5 py-6">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient / Audience</Label>
              <Select
                value={recipient}
                onValueChange={(v) => setRecipient(v as EmailRecipient)}
              >
                <SelectTrigger id="recipient" className="w-full">
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECIPIENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={tone}
                onValueChange={(v) => setTone(v as EmailTone)}
              >
                <SelectTrigger id="tone" className="w-full">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TONE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="key-points">Key Points / Context</Label>
              <Textarea
                id="key-points"
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder={
                  "Paste rough updates or bullet points, e.g.\n- ARR up 18% QoQ, retention at 94%\n- New CRO starts Monday\n- Series C conversations underway"
                }
                className="min-h-44 resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Rough notes are fine — the AI handles structure and polish.
              </p>
            </div>

            <GenerateButton
              loading={loading}
              disabled={keyPoints.trim().length < 3}
              onClick={generate}
              label="Generate Email Draft"
            />
          </CardContent>
        </Card>

        {/* Output */}
        <div className="space-y-4">
          {loading ? (
            <OutputLoadingState label="Drafting your stakeholder email…" />
          ) : error ? (
            <OutputError message={error} onRetry={generate} />
          ) : !result ? (
            <OutputEmptyState message="Your formatted email draft — subject line and professional body — will appear here, ready to copy." />
          ) : (
            <>
              <OutputActions
                source={result.source}
                editing={editing}
                onToggleEdit={() => setEditing((e) => !e)}
                onRegenerate={generate}
                loading={loading}
                copyText={() =>
                  `Subject: ${result.data.subject}\n\n${result.data.body}`
                }
              />
              <Card>
                <CardContent className="space-y-4 py-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="draft-subject" className="text-xs">
                      Subject
                    </Label>
                    {editing ? (
                      <Input
                        id="draft-subject"
                        value={result.data.subject}
                        onChange={(e) =>
                          updateDraft({ subject: e.target.value })
                        }
                      />
                    ) : (
                      <p className="rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground">
                        {result.data.subject}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="draft-body" className="text-xs">
                      Body
                    </Label>
                    {editing ? (
                      <Textarea
                        id="draft-body"
                        value={result.data.body}
                        onChange={(e) => updateDraft({ body: e.target.value })}
                        className="min-h-80 resize-y font-normal"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap rounded-md border bg-card px-4 py-3 text-sm leading-relaxed text-foreground">
                        {result.data.body}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
