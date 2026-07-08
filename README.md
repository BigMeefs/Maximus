# Self Employment Caseload Manager

A specialist Self Employment Toolkit for Restart Scheme advisors — built on
top of a CRM-style caseload manager that scales to any number of offices and
advisors. It complements ICONi (which handles standard Restart
administration) by helping advisors progress participants from referral
through Gateway to a well-evidenced Gainful Self Employment decision. Built
with Next.js (App Router), TypeScript, Tailwind CSS and Supabase.

## Organisation structure

The CRM is organised **Company → Office → Advisor → Participants**. There's
one company (this deployment); offices and advisors are rows in the
database, managed entirely through the Administration panel — adding an
office or an advisor never requires a code change or redeploy.

- No login. The home screen (`/select-advisor`) lists every active advisor
  as a card, pulled live from the database, with a search box and an office
  filter. Picking one opens `/advisors/<id>/dashboard` — that advisor's own
  workspace.
- Each advisor's dashboard and participant list show only participants
  assigned to them (`participants.advisor_id`). There's a link back to the
  home screen from every page ("← All advisors" in the sidebar), and any
  advisor can open any other advisor's workspace from there — e.g. if an
  advisor is on holiday, a colleague can open their workspace directly and
  work their caseload.
- A participant's **office** is never stored directly — it's always derived
  from `participant → advisor → office`. Moving an advisor to a different
  office (or transferring a participant to an advisor in a different office)
  updates every affected participant's effective office automatically, with
  no sync code involved.
- Participant profiles: PTP name, business name, business sector, assigned
  advisor + office (read-only here — see Transfer Participant below), email
  (also used to match the client income tracker), previous advisor
  (freeform — may be someone outside this CRM), scheme start date, Gateway
  target date, calculated days remaining (365-day scheme), website and
  social media links.
- Business plan tracker (Not Started / In Progress / Complete) with optional
  document upload.
- Ongoing action plan tracker with full history.
- Appointment history (date, advisor who conducted it, notes, outcome) — the
  advisor on an appointment can differ from the participant's currently
  assigned advisor (e.g. someone covering).
- Searchable, filterable, responsive participant list, scoped to that
  workspace, with RAG and stage badges.

## Administration panel

`/admin` (passcode-gated — see Security model) is where offices and advisors
are managed. Nothing here is hard-coded; every office and advisor shown
throughout the app comes from these tables.

- **Offices** (`/admin/offices`) — create, rename, and archive/reactivate
  offices. Archiving hides an office from new advisor assignments without
  touching advisors or participants already linked to it.
- **Advisors** (`/admin/advisors`) — add advisors (full name, email, office,
  job title), edit their details, move them between offices, and
  archive/reactivate them. Each advisor's detail page
  (`/admin/advisors/<id>`) shows their current caseload (every participant
  assigned to them) alongside the edit form. There are no individual advisor
  logins in this CRM, so there's no password to reset.
- **Transfer participants** (`/admin/transfer`) — move one or many
  participants to a different advisor in a few clicks: search/filter the
  full participant list, select any number of rows, choose the destination
  advisor, and confirm. Every transfer is logged (`participant_transfers`:
  previous advisor, new advisor, previous/new office, timestamp, optional
  note) for audit purposes, and a participant's office updates automatically
  if the destination advisor is in a different office. Nothing else about
  the participant changes — notes, documents, funding records, AI summaries,
  Gateway/Gainful progress and every other record stay exactly as they were,
  since they all key off the participant's ID, not their advisor.

## Reports

`/reports` (same passcode gate) gives managers company-wide breakdowns to
compare performance across offices and advisors: participants and Gateway/
Gainful readiness rates by office and by advisor, business sector, business
stage, RAG distribution, Gateway status, Gainful status, funding status
(with approved/received totals and outstanding amount), and a monthly
income/expenses chart. Everything here is computed at read time from the
same records the rest of the CRM manages — nothing is duplicated into a
separate reporting table.

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

## Trading Start, In Work Tracking & Outcomes

A case-management layer sits on top of the toolkit above, tracking a
participant from Trading Start through to a confirmed outcome. This is a
separate concept from the 11-stage business Journey and from the pre-Trading
Start Gainful Decision tab — those track *readiness to trade*; this tracks
what happens *after* trading starts.

- **Status** — every participant now has a case-management status (Referral,
  Active, Trading Start, In Work Tracking, Outcome Achieved, Closed), shown
  as a badge on the profile header and logged with a full timestamped history
  (`participant_status_history`, its own "Status History" tab). This is
  distinct from `business_stage` (the Journey tab), which is unaffected.
- **Trading Starts** — a dedicated "Trading Start & IWT" tab records the
  Trading Start Date, Reason (GSE / NGSE / Claim Closed Whilst Self
  Employed), the Assigned IWT Advisor, Transfer Date and Evidence/Notes.
  Confirming one moves the participant to In Work Tracking, reassigns
  `advisor_id` to the IWT advisor (via the same `participant_transfers` audit
  trail as a normal transfer), and permanently records the **original
  advisor** on the Trading Start row itself — so original advisors keep
  ownership of their Trading Start and outcome statistics even after the
  handoff.
- **Automatic eligibility detection** — the Income Tracker is scanned for two
  *consecutive* calendar months with net profit (income − expense − mileage
  cost) above £900. When found, the tab shows an "Eligible for NGSE Trading
  Start" banner with a pre-filled "Create Trading Start" form — nothing is
  ever created automatically; an advisor always confirms.
- **In Work Tracking** — once a Trading Start exists, the tab shows months
  since/remaining against the 6-month outcome window, the current IWT
  advisor, and a review log (date, next review date, notes); overdue reviews
  are flagged in red.
- **Outcome rules** — GSE just needs the participant to remain gainfully
  self-employed for the full 6 months post-Trading Start (advisor-confirmed,
  no monetary target). NGSE and Claim Closed both require cumulative net
  profit from the Income Tracker to reach **£5,300 within 6 months** of the
  Trading Start date — tracked live with a progress bar, and auto-flagged
  once the target is hit (still requires advisor confirmation to record).
- **Outcome record** — Outcome Date, Outcome Type, Achieved (Yes/No),
  Evidence and Advisor Notes; recording one sets status to Outcome Achieved
  or Closed and logs it in the status history.
- **Dashboards** — each advisor's dashboard has a Trading Start/IWT/Outcome
  section (Trading Starts this month, Eligible for Trading Start, In Work
  Tracking caseload, Upcoming/Overdue reviews, Outcome caseload). `/reports`
  adds a company-wide section: Trading Starts and Outcomes for a selectable
  date range, Trading Starts by reason, Outcome conversion rate, IWT
  caseload, average days to Trading Start, average days Trading Start →
  Outcome, participants approaching the 6-month deadline, overdue reviews,
  participants eligible but not yet processed, and an Advisor Performance
  table attributed to the **original** advisor.

This extends the existing schema (`trading_starts`, `iwt_reviews`,
`outcome_records`, `participant_status_history`) and reuses the existing
advisor-scoped workspace model and `/reports` passcode gate — there's no new
authentication or role system: any advisor can still open any workspace (see
Security model below), and "managers only see org-wide reporting" is
satisfied by the existing Reports passcode gate exactly as it already was.

## Data Sync

A "Data Sync" section in the nav (`/advisors/<id>/data-sync`) lets advisors
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
- **Automatic advisor assignment** — if a row's advisor name matches an
  advisor currently in the Administration panel (case-insensitive), it's
  used directly; otherwise new participants fall back to an advisor chosen
  on the Preview & Validate step before the import runs. There's no
  hard-coded advisor list to match against — it's always whoever exists in
  `advisors` at import time.
- **Data validation** — missing required fields, invalid dates/emails,
  advisor names that don't match anyone in the Administration panel, and
  duplicate rows within the same file are all flagged in the preview before
  anything is written.
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

There is no per-advisor authentication. `/advisors/<id>/...` is just a URL —
anyone who opens the app can navigate into any advisor's workspace by
clicking their card; this is intentional (see Organisation structure above),
not an oversight. Row-level security is disabled on every table, so **the
Supabase anon key (shipped in the browser bundle) has full read/write access
to all participant data, independent of workspace-based navigation.**

The Administration panel and Reports (`/admin`, `/reports`) sit behind a
single **shared passcode** (`ADMIN_PASSCODE`, set once as an environment
variable) rather than individual accounts — consistent with the rest of the
app's no-login model, but keeping org-structure changes and cross-office
reporting out of casual reach. Entering the correct passcode sets a signed,
httpOnly, 8-hour session cookie; there's a "Log out" link in the admin
header. If `ADMIN_PASSCODE` isn't set, the gate always rejects every
passcode (rather than failing open).

This is fine for a small, trusted internal tool, but it means:

- Do not deploy this somewhere publicly reachable without another access
  barrier in front of it (e.g. a hosting platform's password protection, a
  VPN, or an IP allowlist).
- Anyone with the anon key can call the Supabase REST API directly and bypass
  the app's UI (and the admin passcode gate) entirely.
- The admin passcode is a casual-access deterrent, not a hardened auth
  system — anyone who knows it has full admin access from any device.

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

Migration `0009_org_structure.sql` also **auto-migrates any pre-existing
participants** onto the new structure: it creates a placeholder office
("Main Office") and, if you're upgrading a CRM that had the original
four-advisor setup, seeds those four advisors into it with placeholder
emails (`<name>@placeholder.internal`) and backfills every participant's
`advisor_id`. After migrating, go to `/admin/offices` to rename "Main
Office" to your real office name(s), and `/admin/advisors` to fix up each
advisor's email and split them across offices as needed — no participant
data is lost in the process.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Set `ADMIN_PASSCODE` to any shared passcode to enable the Administration
and Reports sections (`/admin`, `/reports`). Without it, those sections
always reject every passcode.

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
If this is a fresh database with no advisors yet, go straight to `/admin` to
add your first office and advisor.

### Deploying (e.g. Vercel)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_PASSCODE`
(and optionally `ANTHROPIC_API_KEY`) also need to be set as **Environment
Variables on the hosting project itself** (Vercel: Project Settings →
Environment Variables) — `.env.local` is git-ignored and never reaches a
deployment. If the Supabase vars are missing, every page that talks to
Supabase (e.g. an advisor's dashboard) will fail to load. After adding or
changing them, redeploy — Next.js inlines these at build time, so an
existing deployment won't pick up new values on its own.

## Project structure

- `supabase/migrations` — SQL schema and storage buckets.
- `src/app/select-advisor` — the home screen (dynamic advisor cards, search,
  office filter).
- `src/app/advisors/[advisorId]` — one advisor's workspace: layout/nav
  shell, dashboard, participants list, and participant create/edit/profile
  pages, all scoped to the `advisorId` route segment (the advisor's UUID,
  not their name — so display names can be renamed or reused across offices
  without breaking anything).
- `src/lib/data/advisor.ts` — the single source of truth for advisor/office
  lookups: `getAdvisorOrNotFound`, `listAdvisors`, `listOffices`,
  `getAdvisorCaseloadCounts`. Every part of the app that needs to know about
  advisors or offices goes through this file.
- `src/app/admin` — the Administration panel (offices, advisors, transfer
  participants), gated by `src/components/admin-gate.tsx` /
  `src/lib/admin-auth.ts`. Server actions in `src/lib/actions/admin.ts` and
  `src/lib/actions/transfer.ts`.
- `src/app/reports`, `src/lib/data/reports.ts` — the company-wide reporting
  dashboard; same passcode gate as `/admin`.
- `src/lib/business-rules.ts` — Gateway/Gainful checklist %, business health
  scores, RAG suggestion, and appointment/action-derived facts (next
  appointment, last contact, days until Gateway) — all computed, nothing
  stored twice. Reused by both individual participant profiles and the
  company-wide Reports page.
- `src/lib/next-best-action.ts` — the deterministic Next Best Action engine.
- `src/lib/actions` — server actions for participants, business plans,
  monthly performance, evidence, action plan items, appointments, the
  business journey stage, RAG/health confidence, Gateway/Gainful checklists,
  funding, HMRC info, digital presence, and the AI assistant.
- `src/lib/data-sync` — the source-agnostic import engine: file parsing
  (`.xlsx`/`.csv`), field-mapping suggestions, date normalization, row
  validation, and participant matching. `src/lib/actions/data-sync.ts` wraps
  it for the UI (preview, run import, saved mappings, history, dashboard
  stats) and resolves advisor names in imported rows against the live
  `advisors` table.
- `src/app/advisors/[advisorId]/data-sync` — Sync Dashboard, Import wizard,
  Import History (+ per-batch detail), and Field Mappings pages.
- `src/lib/supabase` — Supabase client helpers.
- `integrations/google-apps-script` — reference copy of the Apps Script
  function that syncs the external client income tracker form into the
  CRM's Income Tracker tab. Not part of the Next.js app; paste it into the
  Apps Script project that already handles that form's Sheets/Drive writes.
