# ExecSphere AI

Build a clean, modern, and professional web application called "ExecPulse AI"—an executive-level workplace assistant designed specifically for CEOs and executives to streamline stakeholder communication, meeting management, and strategic scheduling.

The application must feature a left sidebar navigation, a central dashboard layout, a responsive design for mobile and desktop, and a persistent top or bottom banner displaying a Responsible AI Disclaimer ("AI-generated outputs are intended as executive drafts. Please review for sensitivity, accuracy, and strategic alignment before sending to stakeholders.").

Use the following structure and layout for the sidebar tabs:

1. Dashboard (Overview)

Header displaying high-level stats (e.g., Updates Sent, Meetings Summarized, Tasks Scheduled).

Quick action cards to launch into any of the 4 main executive tool modules.

A brief welcome section framing the app as a CEO Productivity Suite.

2. Stakeholder Comms (Smart Email Generator)

Inputs:

Select Recipient/Audience (Dropdown: Board of Directors, Investors, All-Hands/Internal Team, External Partners).

Select Tone (Dropdown: Formal Executive, Direct & Concise, Motivating, Firm/Strategic).

Key Points/Context (Text area for rough updates or bullet points).

Output: Formatted email draft with subject line, professional body text, and a "Copy to Clipboard" button.

3. Executive Briefing (Meeting Notes Summarizer)

Inputs:

Raw Meeting Notes / Transcript (Large text area).

Summary Focus (Checkboxes: Key Decisions, Action Items, Risk Factors).

Output: Structured Executive Briefing broken down into cleanly formatted cards/sections: Executive Summary, Key Decisions, and Action Items (with delegated owner & priority level).

4. Strategic Planner (AI Task Planner / Scheduler)

Inputs:

Unstructured Task List / To-Do Items (Text area).

Planning Window (Radio options: Today's Schedule vs. Weekly Overview).

Output: Time-blocked calendar view/list prioritizing items using urgency and strategic importance, including suggested focus blocks and buffer times.

5. Market & Competitor Briefs (AI Research Assistant)

Inputs:

Topic, Article Text, or Industry Report Summary Request (Text area).

Output: 3-bullet "Executive TL;DR", Key Strategic Insights, and Recommended Actionable Takeaways.

Design & UI Styling:

Use a polished, high-end corporate color palette (slate blue, deep navy, neutral cool grays, crisp white cards).

Include clear loading states, realistic mock data for AI outputs when testing without live API keys, and dedicated output containers with action buttons (Copy, Regenerate, Edit).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/39920364-2a00-43c5-b0b4-e65138cfa184).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
