# Self Employment Caseload Manager

A specialist Self Employment Toolkit for Restart Scheme advisors (Kyle,
Charles, Elliott, Aroosa) — built on top of a CRM-style caseload manager.
It complements ICONi (which handles standard Restart administration) by
helping advisors progress participants from referral through Gateway to a
well-evidenced Gainful Self Employment decision. Built with Next.js (App
Router), TypeScript, Tailwind CSS and Supabase.

## Core CRM

- No login. The home screen (`/select-advisor`) lists the four advisors as
  cards; picking one opens `/advisors/<name>/dashboard` — that advisor's own
  workspace.
- Each advisor's dashboard and participant list show only participants
  belonging to that workspace (`participants.advisor_name`). There's a link
  back to the home screen from every page ("← All advisors" in the sidebar),
  and any advisor can open any other advisor's workspace from there — e.g.
  if Charles is on holiday, Kyle can open `/advisors/Charles/dashboard` and
  work his caseload directly.
- Participant profiles: PTP name, business name, business sector, advisor
  (the workspace that created them), previous advisor, scheme start date,
  Gateway target date, calculated days remaining (365-day scheme), website
  and social media links.
- Business plan tracker (Not Started / In Progress / Complete) with optional
  document upload.
- Ongoing action plan tracker with full history.
- Appointment history (date, advisor, notes, outcome).
- Searchable, filterable, responsive participant list, scoped to that
  workspace, with RAG and stage badges.

## Self Employment Toolkit

Every participant profile now includes, above the original CRM tabs:

- **Next Best Action** — a rule-based engine inspects business stage, the
  Gateway/Gainful checklists, funding, monthly performance, outstanding
  actions and last contact, and surfaces the single most useful next step
  (e.g. "Register for a UTR.", "Complete the Cashflow Forecast."). It
  recalculates on every page load — nothing is cached or manually set.
- **Self Employment Overview** — RAG status (advisor-set, with a computed
  suggestion based on inactivity/missing evidence), current stage, Gateway
  and Gainful readiness %, days until Gateway, next appointment, outstanding
  actions and last contact date (the last two computed from Appointment
  History and the Action Plan, not stored separately).
- **Business Health Score** — Planning, Finance, Marketing, Trading, Legal,
  Digital Presence and Customer Acquisition are computed live from existing
  data; Confidence is the one advisor judgement call (a slider).
- **Journey** — the 11-stage business journey (Idea → ... → Gainful
  Decision) as a visual timeline; advisors move participants forward with a
  click.
- **Gateway** — a 16-item readiness checklist. Eight items are auto-derived
  from data you've already entered elsewhere (business plan, HMRC info,
  website, evidence, trading stage); the rest are manual checkboxes. Shows
  a live readiness %.
- **Gainful Decision** — trading consistency, auto income trend, evidence,
  invoices, bank statements and customer base feed a readiness %; advisor
  recommendation, manager approval and an overall 🟢/🟡/🔴 recommendation.
- **Funding** — funding source, requested/approved/received amounts (with
  remaining computed automatically), purpose, status, dates, notes, and a
  document upload per record.
- **Monthly Performance** (extends the former Monthly Earnings tab) — income,
  expenses, hours worked, customer count, largest customer and notes per
  month; profit is computed, not entered. Chart views for income/expenses,
  profit, customer growth and hours worked.
- **HMRC & Business** — structure, UTR, registration date, VAT/PAYE, bank
  account, insurance, accountant details, tax deadline notes.
- **Digital Presence** — the 9 standard channels (Website, Facebook,
  Instagram, LinkedIn, TikTok, Google Business Profile, YouTube, Online
  Booking, Google Reviews), each active/not-created with a URL, notes, and a
  completion %.
- **Evidence Vault** (extends the former Evidence Library tab) — the same
  upload/view/delete flow, now organised into folders by category (Business
  Plan, Cashflow, Invoices, Receipts, Quotes, Bank Statements, Insurance,
  Certificates, Marketing Material, Photos, Other).
- **AI Assistant** — summarises notes into case notes, drafts participant
  emails, suggests SMART actions, highlights missing Gateway/Gainful
  evidence, critiques business plans, and suggests marketing ideas, funding
  opportunities and next-appointment questions — tailored to the
  participant's live stage and readiness data. Requires `ANTHROPIC_API_KEY`
  (see below); without it, the tab explains what to add rather than failing
  silently.

Nothing here duplicates data that already exists elsewhere — readiness %,
health scores, days-until-Gateway, next appointment, last contact and
income/customer trends are all computed at read time from the same
underlying records the other tabs already manage.

## Security model

There is no authentication. `/advisors/<name>/...` is just a URL — anyone who
opens the app can navigate into any advisor's workspace by typing or clicking
their name; this is intentional (see above), not an oversight. Row-level
security is disabled on every table, so **the Supabase anon key (shipped in
the browser bundle) has full read/write access to all participant data,
independent of the workspace-based navigation.** This is fine for a small,
trusted internal tool, but it means:

- Do not deploy this somewhere publicly reachable without another access
  barrier in front of it (e.g. a hosting platform's password protection, a
  VPN, or an IP allowlist).
- Anyone with the anon key can call the Supabase REST API directly and bypass
  the app's UI entirely.

## Getting started

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) and grab the project
URL and anon key from Project Settings → API.

### 2. Apply the database schema

Run the SQL migrations in `supabase/migrations` against your project, in
order, using the Supabase SQL editor or the Supabase CLI:

```bash
supabase db push
# or paste each file in supabase/migrations/*.sql into the SQL editor in order
```

This creates all tables and the `business-plans` / `evidence-files` /
`funding-documents` storage buckets.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Optionally add `ANTHROPIC_API_KEY` to enable the AI Assistant tab (get one at
[console.anthropic.com](https://console.anthropic.com)). Without it, that tab
still works but shows a message explaining it isn't configured — every other
feature is unaffected.

### 4. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick an advisor, and go.

### Deploying (e.g. Vercel)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and optionally
`ANTHROPIC_API_KEY`) also need to be set as **Environment Variables on the
hosting project itself** (Vercel: Project Settings → Environment Variables)
— `.env.local` is git-ignored and never reaches a deployment. If the
Supabase vars are missing, every page that talks to Supabase (e.g. an
advisor's dashboard) will fail to load. After adding or changing them,
redeploy — Next.js inlines these at build time, so an existing deployment
won't pick up new values on its own.

## Project structure

- `supabase/migrations` — SQL schema and storage buckets.
- `src/app/select-advisor` — the home screen (advisor selection cards).
- `src/app/advisors/[advisor]` — one advisor's workspace: layout/nav shell,
  dashboard, participants list, and participant create/edit/profile pages,
  all scoped to the `advisor` route segment.
- `src/lib/business-rules.ts` — Gateway/Gainful checklist %, business health
  scores, RAG suggestion, and appointment/action-derived facts (next
  appointment, last contact, days until Gateway) — all computed, nothing
  stored twice.
- `src/lib/next-best-action.ts` — the deterministic Next Best Action engine.
- `src/lib/actions` — server actions for participants, business plans,
  monthly performance, evidence, action plan items, appointments, the
  business journey stage, RAG/health confidence, Gateway/Gainful checklists,
  funding, HMRC info, digital presence, and the AI assistant.
- `src/lib/supabase` — Supabase client helpers.
