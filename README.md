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
- **Income Tracker** — populated automatically from the client-facing income
  tracker form (see `integrations/google-apps-script/`) via the
  participant's Email field, one entry per calendar month. Kept separate
  from Monthly Performance so the two data sources never overwrite each
  other; Net Profit is computed live, not stored. Advisors can also add or
  edit entries here directly.

Nothing here duplicates data that already exists elsewhere — readiness %,
health scores, days-until-Gateway, next appointment, last contact and
income/customer trends are all computed at read time from the same
underlying records the other tabs already manage.

## Data Sync

A "Data Sync" section in the nav (`/advisors/<name>/data-sync`) lets advisors
bulk-import participant data from exported Power BI reports (`.xlsx`/`.csv`),
instead of entering each participant by hand.

- **Import wizard** (`.../data-sync/import`) — a 4-step flow: upload a file,
  map spreadsheet columns to CRM fields (auto-suggested from the header text,
  with previously-used mappings remembered automatically), preview every row
  with its predicted outcome and any validation issues, then confirm to run
  the import and see a summary.
- **Intelligent matching** — never creates a duplicate participant. Each row
  is matched against existing participants in priority order: external
  Participant ID, then Email, then Phone, then National Insurance Number,
  then Name + Date of Birth. A match updates that participant; no match
  creates a new one.
- **Safe Import Rules** — updates only ever touch the fields a row actually
  supplied a value for, and only ever touch `participants` columns. Funding,
  Gateway/Gainful checklists, Business Health Score, evidence, business plan
  status and every other CRM-managed record are structurally untouched by an
  import — the import engine has no code path that writes to those tables.
- **Automatic advisor assignment** — if a row includes a recognised advisor
  name it's used directly; otherwise new participants fall back to an advisor
  chosen on the Preview & Validate step before the import runs.
- **Data validation** — missing required fields, invalid dates/emails,
  unrecognised advisor names, and duplicate rows within the same file are all
  flagged in the preview before anything is written.
- **Import History** (`.../data-sync/history`) — every import batch (date,
  imported by, file name, rows processed/created/updated/duplicated/errored,
  status), with a per-batch detail page and a downloadable CSV error report
  for any failed rows.
- **Field Mappings** (`.../data-sync/mapping`) — view and forget saved
  column → field mappings.
- **Sync Dashboard** (`.../data-sync`) — last import date, totals imported/
  created/updated, error count, imports this month, and a chart of recent
  import activity.
- **Future Power BI integration** — the import engine (`src/lib/data-sync/`)
  is deliberately source-agnostic: it operates on a generic row shape, not on
  file-upload specifics, so a future direct Power BI API connector can feed
  it the same way a parsed spreadsheet does today. A disabled "Connect to
  Power BI (Coming soon)" option is already in the upload step.

`national_insurance_number` is stored as an optional matching-key field on
participants for this feature. It's a sensitive UK identifier — see the
Security model section below, since it carries the same open-access tradeoff
as every other field in this database.

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
- `src/lib/data-sync` — the source-agnostic import engine: file parsing
  (`.xlsx`/`.csv`), field-mapping suggestions, date normalization, row
  validation, and participant matching. `src/lib/actions/data-sync.ts` wraps
  it for the UI (preview, run import, saved mappings, history, dashboard
  stats).
- `src/app/advisors/[advisor]/data-sync` — Sync Dashboard, Import wizard,
  Import History (+ per-batch detail), and Field Mappings pages.
- `src/lib/supabase` — Supabase client helpers.
- `integrations/google-apps-script` — reference copy of the Apps Script
  function that syncs the external client income tracker form into the
  CRM's Income Tracker tab. Not part of the Next.js app; paste it into the
  Apps Script project that already handles that form's Sheets/Drive writes.
