import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  FileCheck2,
  Globe2,
  HeartHandshake,
  Newspaper,
  NotebookPen,
  Send,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ExecPulse AI" },
      {
        name: "description",
        content:
          "ExecPulse AI dashboard: executive stats, quick actions, and the CEO Productivity Suite for stakeholder comms, briefings, planning, and market intelligence.",
      },
      { property: "og:title", content: "Dashboard — ExecPulse AI" },
      {
        property: "og:description",
        content:
          "The CEO Productivity Suite: stakeholder comms, meeting briefings, strategic planning, and market intelligence in one executive workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const stats = [
  {
    label: "Updates Sent",
    value: "148",
    delta: "+12 this week",
    icon: Send,
  },
  {
    label: "Meetings Summarized",
    value: "86",
    delta: "+6 this week",
    icon: NotebookPen,
  },
  {
    label: "Tasks Scheduled",
    value: "342",
    delta: "+28 this week",
    icon: CalendarClock,
  },
  {
    label: "Briefs Generated",
    value: "57",
    delta: "+4 this week",
    icon: FileCheck2,
  },
];

const modules = [
  {
    title: "Executive Daily Brief",
    description:
      "Synthesize context, meetings, and market intel into a one-page morning brief with priorities and a proposed schedule.",
    url: "/daily",
    icon: Newspaper,
    tag: "Morning Command Brief",
  },
  {
    title: "Stakeholder Comms",
    description:
      "Turn rough bullet points into polished, tone-calibrated emails for your board, investors, team, or partners.",
    url: "/comms",
    icon: Send,
    tag: "Smart Email Generator",
  },
  {
    title: "Executive Briefing",
    description:
      "Paste raw meeting notes and get a structured briefing: key decisions, action items with owners, and risks.",
    url: "/briefing",
    icon: NotebookPen,
    tag: "Meeting Summarizer",
  },
  {
    title: "Strategic Planner",
    description:
      "Convert an unstructured to-do list into a time-blocked day or week, prioritized by strategic importance.",
    url: "/planner",
    icon: CalendarClock,
    tag: "AI Task Scheduler",
  },
  {
    title: "Calendar Guardrails",
    description:
      "Audit your calendar for back-to-back chains and missing prep time, then protect focus, buffer, and recovery blocks.",
    url: "/guardrails",
    icon: ShieldCheck,
    tag: "Schedule Health Audit",
  },
  {
    title: "Stakeholder Sentiment",
    description:
      "Read the temperature of a key relationship from your interaction history and get a tone-calibrated follow-up email.",
    url: "/stakeholders",
    icon: HeartHandshake,
    tag: "Relationship Intelligence",
  },
  {
    title: "Market & Competitor Briefs",
    description:
      "Brief yourself on any topic or article: a 3-bullet TL;DR, strategic insights, and actionable takeaways.",
    url: "/briefs",
    icon: Globe2,
    tag: "AI Research Assistant",
  },
] as const;


function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Welcome */}
      <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div
            className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-sidebar-primary/25 blur-3xl"
            aria-hidden
          />
          <Badge className="mb-4 bg-sidebar-primary/30 text-primary-foreground hover:bg-sidebar-primary/30">
            CEO Productivity Suite
          </Badge>
          <h1 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-4xl">
            Good morning, Executive. Your command center is ready.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
            ExecPulse AI streamlines stakeholder communication, meeting
            management, and strategic scheduling — so you spend your time on
            decisions, not drafting.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Executive statistics">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="space-y-2 py-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <stat.icon className="h-4 w-4" />
                  </span>
                  <span className="flex items-center gap-0.5 text-[11px] font-medium text-success">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.delta}
                  </span>
                </div>
                <p className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label="Executive tools">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Executive Tools
            </h2>
            <p className="text-sm text-muted-foreground">
              Jump into any module — drafts are generated in seconds.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((mod) => (
            <Link key={mod.title} to={mod.url} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 py-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                      <mod.icon className="h-5 w-5" />
                    </span>
                    <Badge variant="secondary">{mod.tag}</Badge>
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-foreground">
                    {mod.title}
                  </h3>
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                    {mod.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    Open module
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
