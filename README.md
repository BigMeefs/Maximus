# Max Self Employment Hub

A specialist Self Employment Toolkit for Restart Scheme advisors — built on
top of a CRM-style caseload manager that scales to any number of offices and
advisors. It complements Iconi (which handles standard Restart
administration, appointments, and general case notes) by helping advisors
progress participants from referral through Gateway to a well-evidenced
Gainful Self Employment decision, and by automating Trading Start / In Work
Tracking / Outcome tracking. Built with Next.js (App Router), TypeScript,
Tailwind CSS and Supabase.

## Organisation structure

The CRM is organised **Company → Office → Advisor → Participants**. There's
one company (this deployment); offices and advisors are rows in the
database, managed entirely through the Admin Dashboard — adding an office
or an advisor never requires a code change or redeploy.

### Two portals from one home screen

`/select-advisor` is the single landing page (`/` redirects here) and stays
the main entry point for everyone — but it now leads to two separate
experiences instead of one:

- **Advisor Portal** — pick an advisor card to open `/advisors/<id>/dashboard`,
  that advisor's own workspace (Dashboard, Self Employment, Participants,
  Notifications, Data Sync in the sidebar). This is unchanged from before.
- **Management Portal** — an **Admin Login** button in the top-right corner
  of the home screen, separate from the advisor cards, goes straight to
  `/admin` and its passcode gate (the same authentication this app has
  always used for Administration/Reports — see Security model below). On
  success it lands directly on the Admin Dashboard. A manager or admin
  never has to open an advisor's workspace first to get there.

The Advisor Portal's sidebar no longer links to Reports or Administration
at all — those only exist inside the Management Portal now, reached via the
Admin Login button. Nothing was deleted: every admin/reporting route,
permission and piece of data is exactly what it was before, only the
navigation path to it changed. See "Administration panel" below for what
the Management Portal itself now looks like.

- No login for the Advisor Portal. The home screen lists every active
  advisor as a card, pulled live from the database, with a search box and
  an office filter.
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
- Participant profiles: PTP name, **Iconi ID** (the participant's reference
  number in Iconi — free text, unique if set, shown as a badge next to the
  name at the top of the profile), business name, business sector, assigned
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
  workspace, with RAG and stage badges. Search matches Participant Name,
  Iconi ID, Email and Business Name.

## Administration panel (the Management Portal)

`/admin` (passcode-gated — see Security model) is the Admin Dashboard, the
landing page of the **Management Portal** — reached via the Admin Login
button on the home screen, not through an advisor's workspace. Its own
nav bar has just two items, **Admin Dashboard** and **Reports**, matching
the two-portal split described above; every admin tool below still exists
at its own URL and still does exactly what it did before, just reached via
a card on the Admin Dashboard instead of its own top-level nav link. Two
things named in earlier requirements for this dashboard — **Audit Logs**
and **System Settings** — don't exist anywhere in this codebase and
weren't added; everything else does, listed below with its new name where
one was given (e.g. "User Management" for the Advisors screen).

Nothing here is hard-coded; every office and advisor shown throughout the
app comes from these tables.

- **Office Management** (`/admin/offices`) — create, rename, and archive/reactivate
  offices. Archiving hides an office from new advisor assignments without
  touching advisors or participants already linked to it.
- **User Management** (`/admin/advisors`) — add advisors (full name, email, office,
  job title), edit their details, move them between offices, and
  archive/reactivate them. Each advisor's detail page
  (`/admin/advisors/<id>`) shows their current caseload (every participant
  assigned to them) alongside the edit form. There are no individual advisor
  logins in this CRM, so there's no password to reset.
- **Transfer participants** (`/admin/transfer`) — move one or many
  participants to a different advisor in a few clicks: search the full,
  company-wide participant list by Participant Name, Iconi ID, Email,
  Business Name or current Advisor, optionally filter by advisor too,
  select any number of rows, choose the destination advisor, and confirm.
  This is the only screen that lists every participant across every office
  at once, so it's the natural home for company-wide participant search. Every transfer is logged (`participant_transfers`:
  previous advisor, new advisor, previous/new office, timestamp, optional
  note) for audit purposes, and a participant's office updates automatically
  if the destination advisor is in a different office. Nothing else about
  the participant changes — notes, documents, funding records, AI summaries,
  Gateway/Gainful progress and every other record stay exactly as they were,
  since they all key off the participant's ID, not their advisor.
- **Programme Settings** (`/admin/programme-settings`) — the configurable
  Trading Start / Outcome thresholds; see the dedicated section below.

## Reports (the Manager Dashboard)

`/reports` (same passcode gate) is the manager-facing dashboard: company-wide
breakdowns to compare performance across offices and advisors. There is no
separate "Manager Dashboard" page — `/reports` already served that purpose,
so it was extended in place rather than duplicated.

- **Filters** — Office, Advisor and Date Range, at the top of the page,
  apply to every section below and refresh immediately on change (no "Apply"
  button; a client component pushes the new query string and the page
  re-renders). Picking an office narrows the advisor dropdown to that
  office's advisors. There is no "Team" filter — no Team entity exists
  anywhere in this app's data model (the hierarchy is Company → Office →
  Advisor → Participants), and nothing else in the CRM references teams, so
  this was intentionally left out rather than inventing a new entity and
  admin UI for it.
- **Office Overview** — total participants, Gateway/Gainful readiness,
  funding approved/outstanding, a monthly income/expenses chart, and
  breakdowns by office, by advisor, business sector, business stage, RAG
  distribution, Gateway status, Gainful status and funding status.
- **Office Reporting** — a dedicated per-office table: Trading Starts,
  Outcomes, GSE / NGSE / Claim Closed participants (from each Trading
  Start's recorded reason), Active IWT, Funding Requests/Approved/Rejected,
  and Income Tracker Compliance (the % of that office's Active participants
  who have logged an Income Tracker entry for the current calendar month).
- **Funding Approval Queue** — a summary card linking to
  `/admin/funding-approvals`, showing how many requests are currently
  awaiting a manager decision.
- **Trading Start, IWT & Outcomes** — Trading Starts and Outcomes for the
  selected period, Forecast Outcomes (live participant progress, not manual
  entry — see Forecasting below), IWT caseload, outcome conversion rate,
  participants approaching the Outcome deadline, overdue reviews,
  participants at risk, participants eligible for a Trading Start but not
  yet processed, average days to Trading Start / Trading Start → Outcome, a
  monthly trend chart, and a team leaderboard (attributed to the
  **original** advisor — see Trading Start & IWT Visibility below).

Everything here is computed at read time from the same records the rest of
the CRM manages — nothing is duplicated into a separate reporting table.

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
- **Business Health Score** — Planning, Finance, Marketing, Trading, Legal
  and Digital Presence are computed live from existing data; Confidence is
  the one advisor judgement call (a slider). (A Customer Acquisition
  dimension existed while there was a separate Monthly Performance tab
  tracking customer count/hours worked; it was removed along with that tab
  — see "Removed: Monthly Performance" below — rather than left silently
  stale with no data source.)
- **Journey** — now the **Participant Journey Timeline**, a case-management
  view distinct from the underlying Business Readiness Stage tracker (see
  the dedicated section below for the full picture, including what happened
  to the old 10-stage stepper).
- **Gateway** — one combined page (previously two separate tabs: "Gateway"
  and "Gainful Decision"), presented as two clearly separated cards so it
  reads as a single workflow:
  - **Gateway Assessment** — a readiness checklist (auto-derived items plus
    manual checkboxes) with a live readiness %, the participant's Gateway
    target date, a free-text Advisor Notes field, and **Gateway booking**:
    **Gateway Booked** (Not Booked / Booked / Completed), an appointment
    date once Booked, and — required once Completed — a **Gateway Outcome**
    (GSE / NGSE) that feeds directly into the Trading Start eligibility
    engine (see "Gateway booking & outcome" below).
  - **Gainful Decision** — trading consistency, auto income trend,
    evidence, invoices, customer base, business sustainability and expected
    profitability feed a readiness %; a Supporting Evidence list (reads
    from the same Evidence Vault records, not a separate upload); advisor
    recommendation, manager approval, manager notes, a Decision Date, and
    the Gainful Outcome (the overall 🟢/🟡/🔴 recommendation — a different
    concept from the Gateway Outcome GSE/NGSE dropdown above, despite the
    similar name; see below).

  Nothing from either original tab was removed except where the operational
  process update below explicitly says so.
- **Funding** — funding source (a fixed dropdown: Business Card, BACS or
  Voucher — no free text), requested/approved/received amounts (with
  remaining computed automatically), purpose, dates, notes, a document
  upload per record, and an approval workflow (see "Funding Approval
  Workflow" below) — status is no longer a manual field; it's set
  automatically from the requested amount and, above £100, from a manager's
  decision. The dropdown restriction is enforced in the UI and in the
  server action, not as a database constraint: a couple of existing
  records predate it with other values (e.g. a historical "Maximus"
  entry), and forcing those into one of the three new options would
  misrepresent real data, so they're left exactly as they are and stay
  selectable on their own record without being editable to free text.
- **HMRC & Business** — Business Structure, UTR Number, three tick boxes
  (Business Bank Account, Insurance, VAT Registered, PAYE Registered) and
  one free-text Notes field — deliberately simplified down to what the team
  actually records (see "HMRC & Business simplification" below).
- **Digital Presence** — the 9 standard channels (Website, Facebook,
  Instagram, LinkedIn, TikTok, Google Business Profile, YouTube, Online
  Booking, Google Reviews), each with a per-platform status (Complete / In
  Progress / Not Started / Not Needed — see "Digital Presence status"
  below), a URL, notes, and a completion %.
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
- **Income Tracker** — one entry per calendar month, from three sources:
  the client-facing Google Form (see `integrations/google-apps-script/`),
  the public **Participant Income Tracker Portal** (see below), or an
  advisor adding/editing an entry directly on this tab — all matched to a
  participant by their Email field, all landing in the same table, all
  showing Miles and a live-calculated mileage deduction. Net Profit is
  computed live, not stored. This is the CRM's single source of monthly
  earnings data — see "Removed: Monthly Performance" below.

Nothing here duplicates data that already exists elsewhere — readiness %,
health scores, days-until-Gateway, next appointment, last contact and
income/customer trends are all computed at read time from the same
underlying records the other tabs already manage.

### Removed: Monthly Performance

The Monthly Performance tab (income, expenses, hours worked, customer count
per month) was removed — the Income Tracker tab already provides the
required monthly earnings data, so the two tabs were redundant. **The Income
Tracker itself was not touched.** Everything that read from Monthly
Performance was rewired onto the Income Tracker instead: the income trend
used in the Gainful Decision checklist, the Business Health Score's Trading
dimension, the Next Best Action engine, and the "Monthly progress" chart on
Reports. The one thing with no equivalent in the Income Tracker — customer
count / hours worked, and the Customer Acquisition health score dimension
built on top of it — was removed cleanly rather than left silently frozen
with stale data. The underlying `monthly_earnings` database table is left
in place (unused, historical rows intact) rather than dropped.

### Operational process alignment

Four tabs were updated to match how the Self Employment Team actually works
day to day (`supabase/migrations/0020_process_alignment.sql`). Every change
backfills from the data it replaces rather than discarding it.

**Digital Presence status.** Each of the 9 platforms now has a status —
**Complete**, **In Progress**, **Not Started**, **Not Needed** — instead of a
single active/inactive toggle. **Not Needed counts as complete** in every
progress calculation (the tab's own %, the Business Health Score's Marketing
and Digital Presence dimensions, and the Gateway checklist's Website item),
so a business that genuinely doesn't need, say, TikTok isn't penalised for
it; it's shown with a grey "Not Needed" badge rather than the green
"Complete" one, so at a glance an advisor can still tell "intentionally
skipped" apart from "actually done". The old `is_active` boolean is gone —
existing rows were backfilled (`true` → Complete, `false` → Not Started)
before the column was dropped.

**HMRC & Business simplification.** Down to what the team actually records:
Business Structure (now also offering Partnership and CIC, not just Sole
Trader / Limited Company), UTR Number, four tick boxes (Business Bank
Account, Insurance, VAT Registered, PAYE Registered), and one free-text
Notes field. Accountant Name, Accountant Contact, HMRC Registration Date and
Tax Deadline Notes are no longer tracked as separate fields; where any of
them had content, that content was folded into the new Notes field during
the migration rather than deleted outright. The Gateway checklist's old
"HMRC Registration" auto-item (which read the now-removed registration
date) was retired for the same reason — the checklist's separate "UTR" item
already captures the same real-world fact — and "Insurance" now reads the
new tick box instead of the old free-text field.

**Gainful Decision checklist.** "Bank Statements Provided" is replaced by
**"Expected To Make A Profit"** — the checklist is now: Trading
Consistently, Income Trend, Hours Worked Adequate, Evidence Uploaded,
Invoices Available, Customer Base Established, Business Sustainable,
Expected To Make A Profit.

**Gateway booking & outcome.** Below the Gateway Assessment checklist,
advisors record **Gateway Booked** (Not Booked / Booked / Completed) with an
appointment date once Booked, and — required once Completed — a **Gateway
Outcome** (GSE / NGSE). This is a different field from the Gainful
Decision's own "Gainful Outcome" (🟢/🟡/🔴 Ready / Needs Further Evidence /
Not Yet Ready) despite the similar name — the Gateway Outcome specifically
answers "which Trading Start route", and saving it has a real side effect:
selecting **GSE** marks the participant Gainfully Self Employed exactly like
the existing Trading Start tab's "Mark as GSE" action (`is_gse = true`,
`gse_marked_at`, `gse_marked_by`); selecting **NGSE** clears that flag so
the standard two-month income-average rule applies instead. Both paths feed
the same `evaluateTradingStartEligibility` engine described under "Trading
Start, In Work Tracking & Outcomes" below — nothing about that engine
changed, this just gives it another entry point.

**Journey: Initial Appointment removed.** The Participant Journey Timeline
(below) no longer has a separate "Initial Appointment" milestone — the
Appointments module remains fully intact elsewhere in the system (the
Appointment History tab, "Due" tracking, etc.); it just isn't one of the
Journey's headline milestones any more. Nothing was stored for this
milestone (the whole timeline is computed live), so there's no data
migration for it — the remaining milestones simply shift up one position,
which the timeline's sequencing logic already handles generically (see
"extensibility design" below).

## Participant Journey Timeline

The Journey tab (`src/components/participant/journey-tab.tsx`) is now a true
chronological timeline — the primary visual element on every participant
profile — rather than a single stage stepper. A badge next to the
participant's Status/Health badges in the profile header always shows the
current milestone and links straight to the tab.

Seven milestones ship out of the box, each computed live from existing data
(nothing new is stored):

1. **Referral Received** — earliest `participant_status_history` row with
   `to_status = "Referral"`, falling back to the participant's created date.
2. **Business Plan** — the Business Plan record reaching `Complete`.
3. **Gateway** — the same live Gateway readiness % used on the Gateway tab
   reaching 100%.
4. **Trading Start** — a confirmed Trading Start record.
5. **Transfer to IWT** — the Trading Start's IWT advisor differing from the
   original advisor. Participants who are never transferred show this
   milestone as **Not required** rather than stuck "upcoming" forever.
6. **In Work Tracking** — begins the moment Trading Start is confirmed, per
   this CRM's existing IWT model.
7. **Outcome Achieved** — an Outcome record exists. If one exists but wasn't
   achieved, the milestone shows a distinct "not achieved" state instead of
   silently looking incomplete.

(An eighth milestone, **Initial Appointment**, existed until the operational
process alignment update above removed it — the Appointments module itself
is untouched, it's just no longer one of the Journey's headline
milestones.)

Each milestone is one of **completed** (✓), **current** (the first
not-yet-done milestone, hollow indigo ring), or **upcoming** (hollow slate
ring) — decided by a single left-to-right pass, so the status of every
milestone always stays internally consistent as data changes elsewhere in
the app. Clicking any milestone expands its detail: the date, a summary
line, and any notes/evidence already on record for that stage (e.g. the
Gateway checklist's Advisor Notes, the Trading Start date and rule used,
Outcome notes) — nothing is duplicated, it's read from the same records the
rest of the toolkit already manages.

Future milestones (e.g. a new stage a contract wants to insert between
Gateway and Trading Start) only require adding one function to the
`MILESTONE_BUILDERS` array in `src/lib/journey-timeline.ts` — the
sequencing, rendering and click-to-expand behaviour need no changes.

**The original 10-stage Business Readiness Stage stepper was not removed.**
It's still the only advisor-editable "move this participant forward"
control, and it still feeds the Business Health Score's Trading dimension,
Next Best Action, and the Reports "by stage" breakdown — none of which have
an equivalent signal in the new timeline. It now lives in a collapsed
"Business Readiness Stage (internal tracking)" section beneath the timeline,
functionally unchanged.

## Trading Start, In Work Tracking & Outcomes

A case-management layer sits on top of the toolkit above, tracking a
participant from Trading Start through to a confirmed outcome. This is a
separate concept from the 10-stage business Journey and from the pre-Trading
Start Gainful Decision tab — those track *readiness to trade*; this tracks
what happens *after* trading starts.

- **Status** — every participant now has a case-management status (Referral,
  Active, Trading Start, In Work Tracking, Outcome Achieved, Closed), shown
  as a badge on the profile header and logged with a full timestamped history
  (`participant_status_history`, its own "Status History" tab). This is
  distinct from `business_stage` (the Journey tab), which is unaffected.
- **Trading Starts** — a dedicated "Trading Start & IWT" tab records the
  Trading Start Date, Reason (GSE / NGSE / Claim Closed Whilst Self
  Employed), the Trading Start Advisor, Assigned IWT Advisor, Transfer Date
  and Evidence/Notes. Confirming one moves the participant to In Work
  Tracking, reassigns `advisor_id` to the IWT advisor (via the same
  `participant_transfers` audit trail as a normal transfer), and permanently
  records the **original advisor** on the Trading Start row itself — so
  original advisors keep ownership of their Trading Start and outcome
  statistics even after the handoff. A participant is never left with two
  active Trading Starts — creating one while an unresolved one already
  exists updates it in place instead of inserting a duplicate.
- **Three eligibility paths, all advisor-confirmed** — a rules engine
  (`src/lib/trading-start-rules.ts`) evaluates every Active participant
  against three rules, each of which can be extended or added to later
  without touching the others:
  - **GSE** — an advisor marks a participant "Gainfully Self Employed"
    directly on the Trading Start tab; that's the whole rule.
  - **NGSE (2 Month Average)** — every *consecutive* pair of Income Tracker
    months is checked; if the **average** net profit across the pair meets
    the configured threshold (default £900 — see Programme Settings below),
    the participant is eligible. This is an average, not "both months
    individually above the threshold" — e.g. £950 and £850 (average £900)
    qualifies.
  - **Claim Closed** — an advisor marks a participant's claim "Closed" while
    they remain self-employed; kept as its own flag, separate from the
    generic participant status "Closed" (which means "outcome not
    achieved").
  
  Whichever rule fires, the tab shows a banner with the detail (for NGSE:
  both months' net profit, the average, and the date eligible) and a
  pre-filled "Create Trading Start" form — **nothing is ever created
  automatically; an advisor always confirms.** The tab also always shows the
  current two-month average and eligibility live, even before any threshold
  is met.
- **In Work Tracking** — once a Trading Start exists, the tab shows the IWT
  Start Date, months since/remaining and Outcome Due Date against the
  configured monitoring period, the current IWT advisor, and a review log
  (date, next review date, notes); overdue reviews are flagged in red.
- **Outcome rules** — GSE just needs the participant to remain gainfully
  self-employed for the configured GSE monitoring period post-Trading Start
  (advisor-confirmed, no monetary target). NGSE and Claim Closed both require
  cumulative net profit from the Income Tracker to reach the configured
  target within the configured monitoring period of the Trading Start date —
  tracked live with a progress bar (days *and* months remaining shown), and
  auto-flagged "Outcome Ready" once the target is hit (still requires
  advisor confirmation to record).
- **Outcome record** — Outcome Date, Outcome Type, Achieved (Yes/No),
  Evidence and Advisor Notes; recording one sets status to Outcome Achieved
  or Closed and logs it in the status history.
- **Participant Health** — every IWT participant gets a Green (On Track) /
  Amber (Needs Attention) / Red (At Risk) indicator, computed live (nothing
  stored) and shown on the profile header, the Trading Start tab, the Self
  Employment Dashboard and Reports. NGSE/Claim Closed compares actual vs.
  required monthly earnings pace against the Outcome target; GSE factors in
  overdue reviews and missing income declarations. This same health signal
  is what "Forecast likelihood" and "Forecast Outcomes" mean everywhere else
  in the app — Green/Amber both count as "forecast to achieve," Red doesn't
  — deliberately reusing one scoring system rather than inventing a second,
  parallel one.
- **Transferred to IWT visibility** — once a Trading Start moves a
  participant to a different IWT advisor, the **original** advisor keeps a
  read-only "Transferred to IWT" section on their Self Employment Dashboard
  (see below) showing that participant's Outcome progress, current
  cumulative earnings, current status, IWT advisor, Outcome due date,
  forecast likelihood and Outcome-achieved status — because their own
  Trading Start / Outcome statistics still depend on how it turns out. This
  is built as a separate, non-interactive display component with no edit
  affordances and no links into the editable profile, rather than adding a
  read-only mode to every existing tab — only the specific fields listed
  above are shown, not the full participant record. The **IWT advisor**
  remains the only one who can edit the participant after transfer; a
  Manager/Admin can always edit (see Permissions below).
- **Company-wide reporting** — `/reports` adds a Trading Start / IWT /
  Outcome section: Trading Starts and Outcomes for a selectable date range,
  Trading Starts by reason, Outcome conversion rate, IWT caseload, average
  days to Trading Start, average days Trading Start → Outcome, participants
  approaching the Outcome deadline, overdue reviews, participants at risk,
  participants eligible but not yet processed, a monthly Trading
  Starts/Outcomes trend chart, and a team leaderboard (active caseload,
  Trading Starts, Outcomes achieved/not achieved per advisor, ranked and
  attributed to the **original** advisor).

This extends the existing schema (`trading_starts`, `iwt_reviews`,
`outcome_records`, `participant_status_history`, plus `participants.is_gse`
/ `claim_closed` and the new `programme_settings` table) and reuses the
existing advisor-scoped workspace model and `/reports` passcode gate —
there's no new authentication or role system: any advisor can still open any
workspace (see Security model below), and "managers only see org-wide
reporting" is satisfied by the existing Reports passcode gate exactly as it
already was.

## Organisation Branding Settings

`/admin/organisation-settings` (same passcode gate as the rest of
Administration) lets an admin rebrand the app for a different organisation
or contract without touching code or redeploying:

- **Organisation Name** and **Application Name** — shown throughout the
  shared chrome (page titles, the home screen, the sidebar/mobile header,
  the admin login screen, the public Income Tracker Portal) instead of the
  hard-coded "Max Self Employment Hub" / "Maximus UK" text that used to be
  scattered across those components.
- **Organisation Logo** — uploaded to a dedicated `organisation-branding`
  Supabase Storage bucket and shown everywhere the old fixed "SE" badge
  used to appear; removing it reverts every one of those spots to the same
  "SE" badge as a sensible default rather than a broken image.
- **Primary Colour** and **Secondary Colour** — injected as CSS custom
  properties (`--brand-primary` / `--brand-secondary`) on the root
  `<html>` element and consumed by the logo badge, active nav-link
  highlighting, and the primary buttons on the shell/login screens.

All five values live in a single-row `organisation_settings` table (mirroring
the existing `programme_settings` pattern), seeded with `Max Self Employment
Hub` / `Maximus UK` / the CRM's existing indigo (`#4f46e5`) and slate
(`#0f172a`) as defaults — so this ships with the exact same look it already
had, and a rebrand is a form submission, not a deploy.

Two scope decisions worth being explicit about:

- **Colour theming is intentionally scoped to shared chrome, not every
  button in the app.** Recolouring all ~80 components' individual
  indigo-accented buttons/badges/links would be a large, risky change for
  a CRM this size and isn't what "future-proof the platform" requires;
  the brand colours consistently appear wherever an organisation's identity
  is actually visible (logo, primary nav, primary actions on shell/login
  screens), while the rest of the toolkit keeps its existing indigo styling
  unchanged, exactly as required ("maintain the current UI style").
- **The `organisation-branding` Storage bucket is public**, unlike every
  other bucket in this app (Evidence Vault, Funding documents, Portal
  declarations, all of which are private with signed URLs). A logo isn't
  sensitive, and it needs to render on the public, unauthenticated `/portal`
  page — a public bucket avoids a signed-URL round trip on every page load
  for something that carries no confidentiality requirement.

Because organisation settings can change at any time and must be reflected
immediately (no redeploy), the root layout (`src/app/layout.tsx`) is now
`export const dynamic = "force-dynamic"`. This intentionally trades static
prerendering on four routes (`/`, `/select-advisor`, `/portal`,
`/_not-found`) for always-current branding — confirmed via `npm run build`,
which now correctly shows those routes as `ƒ (Dynamic)` rather than
`○ (Static)`.

## Programme Settings

`/admin/programme-settings` (same passcode gate as the rest of Administration)
lets managers change the four thresholds the Trading Start / Outcome rules
engine reads, with no code change or redeploy required:

- **NGSE two-month average threshold** (default £900)
- **Outcome cumulative profit target** (default £5,300)
- **Outcome monitoring period** (default 6 months — NGSE / Claim Closed)
- **GSE Outcome monitoring period** (default 6 months — GSE)

Every eligibility check and Outcome progress calculation throughout the CRM
(the Trading Start tab, the Self Employment Dashboard, Reports, Participant
Health) reads these four values live from the `programme_settings` table —
none of them are hard-coded. Saving a change takes effect on the very next
page load, everywhere.

## Funding Approval Workflow

Every funding request's `application_status` is now set automatically
rather than picked from a dropdown:

- **£100 or below** — approves itself immediately (`Approved`), no manager
  involvement.
- **Above £100** — set to `Pending Manager Approval` and appears in the
  **Funding Approval Queue** (`/admin/funding-approvals`, same passcode gate
  as the rest of Administration), listing every pending request across
  every office with the participant, advisor, office, amount and purpose.
  A manager can approve or reject with optional notes; the decision records
  who made it, when, and the notes (`approved_by`, `approved_at`,
  `manager_notes` on the funding record) — captured as a free-text name
  field on the approval form, consistent with this CRM's no-login model,
  rather than inventing a manager account system just for this. Approving
  or rejecting updates the participant's funding record immediately (no
  separate sync step), and the advisor sees it surface on their dashboard's
  Funding widget (see below) — "notify the advisor" is in-app dashboard
  surfacing, not email/push/SMS, consistent with this CRM's existing
  no-messaging design (see Self Employment Dashboard below).
- Once a request has a manager decision, further advisor edits to that
  record no longer recompute its status — a manager's decision is never
  silently overwritten by a later edit.

## Self Employment Dashboard

**This CRM is not a replacement for Iconi.** Iconi remains the organisation's
primary case management system for appointments, communications, diaries and
general case notes — none of that is duplicated here. This CRM exists purely
to automate the manual work specific to the Self Employment team: detecting
Trading Start eligibility, tracking In Work Tracking and Outcomes, and
analysing earnings. There are deliberately no calendars, messaging, or
generic case notes anywhere in this codebase.

`/advisors/<id>/self-employment` is a dedicated dashboard, separate from the
general CRM dashboard, focused entirely on this:

- **Nine headline cards** — Active Participants, Trading Starts This Month,
  Participants in IWT, Outcomes This Month, Participants Eligible for Trading
  Start, Participants Near Outcome, Participants At Risk, Pending Trading
  Starts, Active Trading Starts (the last two are the same eligibility queue
  and IWT caseload respectively, labelled from the "what's pending my
  confirmation vs. what's already live" angle).
- **Advisor Performance & Forecasting** — Active participants, all-time
  Trading Starts achieved, participants Transferred to IWT, Forecast
  Outcomes and Confirmed Outcomes (all attributed to this advisor as the
  *original* advisor, per the Trading Start section above), plus a live
  count of participants requiring action today. Forecast Outcomes is
  **never manually entered** — it's a live count of this advisor's active
  Trading Starts (their own and their Transferred-to-IWT ones) whose
  Participant Health isn't Red, recomputed on every page load from current
  participant progress.
- **Transferred to IWT** — every participant this advisor originated whose
  Trading Start later moved them to a different IWT advisor, read-only (see
  "Transferred to IWT visibility" above): status, IWT advisor, Outcome
  progress or Outcome-achieved result, and forecast likelihood for the ones
  still in progress.
- **Today's Work** — a single queue combining overdue IWT reviews, missing
  income declarations, participants approaching their Outcome deadline,
  participants whose Outcome is ready to process, and participants newly
  eligible for a Trading Start (via any of the three rules) — sorted
  most-urgent first. Nothing in this queue is a real notification (no
  email/push/SMS): it's a live, computed worklist, consistent with "no
  messaging" above.
- **Trading Start Intelligence** — every Active participant auto-detected as
  eligible for an NGSE Trading Start (see the two-month-average rule above),
  shown with both months' net profit, the average, and the date eligible,
  plus a separate list for participants eligible via GSE or Claim Closed. A
  "Create Trading Start" button opens the real creation form on their
  profile — this is never created automatically.
- **Outcome Intelligence** — every IWT participant's live progress bar
  (cumulative profit / target / % complete / remaining / months left for
  NGSE and Claim Closed; the gainful window for GSE), each flagged "Outcome
  Ready" the moment the criteria are met — again, this only flags readiness;
  the Outcome record itself is always advisor-confirmed. Health badges are
  shown alongside every row.
- **Income Analytics** — the Income Tracker tab now also shows average/
  highest/lowest monthly net profit, total cumulative profit, profit since
  Trading Start, profit towards the Outcome target, and a combined income/
  expenses/net-profit chart.

### The general Advisor Dashboard (action-focused work queue)

The **general** advisor dashboard (`/advisors/<id>/dashboard`) is a
different page from the Self Employment Dashboard above — it's an
action-focused worklist rather than a stats page, so an advisor can open it
and immediately see what needs doing rather than reading passive numbers.
Every card links straight into the relevant participant or queue:

- **Headline counts** — Caseload size, Requiring a Gateway, Funding awaiting
  approval, Approaching Trading Start, Notifications.
- **Participants requiring a Gateway** — Active participants whose live
  Gateway readiness % (the same calculation used on the Gateway tab) is
  below 100%, worst-first.
- **Funding** — this advisor's funding requests currently awaiting manager
  approval, plus recently-decided ones (unchanged from before).
- **Income submitted since you were last here** — every Income Tracker entry
  logged since the advisor's last dashboard visit. There is no login in this
  CRM, so "last visit" is tracked with a simple, explicitly non-authenticating
  browser cookie (`last_visit_<advisorId>`, set on page load) rather than a
  real session — it's a convenience marker, not a security or audit
  mechanism, and falls back to "the last 3 days" the first time an advisor
  opens the page.
- **Approaching Trading Start** and **Transferred to IWT** — reuse the exact
  eligibility and transfer detection already built for the Self Employment
  Dashboard (`getSelfEmploymentDashboard`), so the two dashboards never
  disagree about who's eligible or transferred.
- **Recently achieved Trading Starts** — this advisor's Trading Starts
  confirmed in the last 14 days.
- **Income Tracker alerts**, **expiring participants**, **missing business
  plans** and **outstanding actions** — unchanged from before.
- **Notifications and announcements** — a compact preview of this advisor's
  live Notifications queue (see the dedicated "Notifications" section below
  for the full design: eleven automatic notification types, not just Portal
  submissions), plus a lightweight **Announcements** feature (`announcements`
  table, managed at `/admin/announcements`): short organisation-wide messages
  a manager can post/hide/delete, shown at the top of every advisor's
  dashboard while active. Announcements are separate from the
  participant-notification queue — they're for the team, not about a
  specific participant.

## Participant Income Tracker Portal

`/portal` is a standalone public page — no login, no unique per-participant
link, nothing else in the CRM reachable from it. It's meant to be reached
via a QR code or a shared URL, not by navigating the CRM.

- **Email-only lookup.** A participant enters their email; the CRM matches
  it against `participants.email` (case-insensitive, exact match — same
  matching rule as the Google Apps Script Income Tracker sync). On a match
  it greets them by first name and shows the form. On no match it shows
  "We couldn't find an account using that email address. Please contact
  your Self Employment Advisor." and nothing else — no hint about *why* it
  didn't match, no participant data of any kind.
- **The form**: Date, Gross Income, Business Expenses, Business Mileage
  (Miles), Notes (optional), and an optional Earnings Declaration upload.
  There's no manual mileage cost field — mileage is converted to a cost
  automatically:
  - `miles ≤ 833` → `miles × £0.45`
  - `miles > 833` → `(833 × £0.45) + ((miles − 833) × £0.25)`

  The 833-mile threshold is a *per-submission* (monthly) figure — a twelfth
  of HMRC's real 10,000-mile *annual* threshold — matching this CRM's
  month-by-month Income Tracker model rather than tracking a rolling annual
  mileage total. The mileage deduction and the resulting Net Profit
  (`Gross Income − Business Expenses − Mileage Cost`) are shown live as the
  participant types, then recalculated server-side on submit — the server
  never trusts a client-computed figure.
- **Submitting** upserts an `income_tracker_entries` row for that
  participant/month exactly like every other Income Tracker source (manual
  advisor entry, the Google Apps Script sync), with `source = 'Participant
  Portal'`, `miles`, the calculated `mileage_cost`, and the uploaded
  declaration (if any) in a private `income-tracker-declarations` storage
  bucket. **Net Profit is not stored as its own column** — like every other
  computed figure in this CRM (health scores, readiness %, income trend),
  it's computed live from income/expense/mileage_cost wherever it's shown,
  so it can never drift out of sync with those numbers if they're edited
  later. `submitted_at` is `created_at` — not a separate duplicate column.
- **The manual (advisor-facing) Income Tracker entry form was also
  switched** from a raw "Mileage Cost" input to the same Miles field with
  the same live-calculated deduction, so `miles`/`mileage_cost` mean the
  same thing everywhere in the table regardless of source, rather than only
  the portal path having real mileage data.

### Advisor-facing review

Portal submissions feed two separate things, which used to be conflated:

- The **Income Tracker tab** on the participant's own profile, where every
  submission "automatically appears" regardless of source, with a Status
  badge (Awaiting advisor review / Reviewed by X) and a declaration link
  where present — this is the record itself, and `income_tracker_entries`
  is still the single source of truth for it (see "Notifications" below for
  why review state lives in two places that stay in sync).
- A **notification** in the sidebar's Notifications work queue, prompting
  the advisor to look at it — see the dedicated "Notifications" section
  below for the full design (this used to be the entire meaning of
  "Notifications" in this CRM; it's now one of eleven automatic notification
  types feeding one unified queue).

The **Self Employment Dashboard** also shows a compact "Income Tracker
Submissions" list of this advisor's own unreviewed submissions (queried
directly from `income_tracker_entries`, independent of the notifications
table — see "Notifications" for why these two views can never disagree),
and a **Participant Income Tracker Portal** card at the top with a QR code
(generated server-side from the request's own host, so it doesn't need a
hardcoded production URL) and a copyable link — print it or email it to
participants.

### Security caveat

This does **not** add real access control beyond what already exists (or
doesn't) in this project — see "Security model" below. The portal page and
its server actions are written to only ever return the minimum a
participant should see (a first name on match, nothing on no match, and
the lookup/submit actions never return a participant record), but RLS is
disabled and the anon key is public by design, so anyone calling Supabase's
REST API directly still has the same full read/write access they always
did, independent of this page's own restraint.

## Notifications

The Notifications panel (`/advisors/<id>/notifications`, sidebar bell +
badge) is a real, persisted work queue — a `notifications` table (see
`supabase/migrations/0018_notifications.sql`), not just a computed view over
another table. It's designed to be the advisor's daily task list: it shows
only what still needs a look, and once something's been dealt with it
disappears from the list immediately (no page refresh) without ever being
deleted.

- **Status lifecycle.** Every notification has one of five statuses: **New**,
  **Unread**, **Action Required**, **Reviewed**, **Archived**. The first
  three are "active" and shown in the panel; Reviewed and Archived are
  terminal and hidden from it, but never removed from the database — they're
  the audit trail. Clicking **Mark as Reviewed** sets status to Reviewed,
  records who and when, and (client-side) removes the card from the list the
  moment the action resolves — the same "server action + `revalidatePath`"
  pattern this CRM already uses everywhere else for live updates without a
  hard refresh (e.g. Funding approvals, Announcements). If nothing's active,
  the panel shows "You're all caught up. No notifications require your
  attention."
- **Ten automatic types, two different creation strategies:**
  - **Event-driven** (created the instant the underlying action happens, by
    the same server action that performs it): **Income submitted** (Portal
    submissions only — see below), **Funding approval required / approved /
    declined**, **Transferred to IWT**, **Outcome achieved**.
  - **Lazy/computed** (an ongoing condition, not a one-off event — there's no
    background job or cron in this deployment, so these are (re)computed
    whenever an advisor opens their **Dashboard** or **Notifications** page):
    **Trading Start eligible (GSE / NGSE / Claim Closed)**, **Upcoming
    review** (an appointment or IWT review due within 7 days, or an IWT
    review already overdue). See `src/lib/data/notification-rules.ts` — it
    diffs the freshly computed set of "true right now" conditions against
    whatever's already active and reconciles both directions: creates
    anything newly true, auto-resolves (never deletes) anything no longer
    true.
- **No duplicates for the same unresolved event.** Every notification has an
  optional `dedupe_key`; a partial unique index only enforces uniqueness
  among *active* rows, so a second attempt to raise the same unresolved event
  (e.g. re-running the eligibility check while last time's notification is
  still sitting there un-actioned) is a silent no-op, while the same key
  becomes available again the moment the earlier one is resolved.
- **Auto-resolution.** Where the underlying action itself represents "this
  has been handled," the notification resolves automatically rather than
  waiting for the advisor to also click Mark as Reviewed: creating a Trading
  Start resolves that participant's eligibility notification(s); approving
  or declining a funding request resolves its "approval required"
  notification; logging a new IWT review resolves the stale "upcoming
  review" reminder for that Trading Start.
- **Income Tracker submissions stay in sync in both directions**, but
  deliberately only for **Portal** submissions, not every manual
  advisor-entered row — an advisor typing in their own entry doesn't need a
  notification telling them they just did that. Reviewing the notification
  (from the panel) and reviewing the entry (from the Income Tracker tab, the
  pre-existing flow — see "Participant Income Tracker Portal" above) each
  update the other, so they never disagree about whether a submission's been
  looked at.
- **Notification History** (`/admin/notifications`, linked from the Admin
  Dashboard, same passcode gate as the rest of Administration) is where
  managers see everything, not just what's active: search, and filter by
  Office, Advisor, Participant, Type, Status and Date Range (most recent 300
  matching rows — this CRM's scale doesn't call for real pagination).
  Archiving here is a distinct action from an advisor reviewing their own
  queue — a manager can archive (and **Restore**) any notification
  regardless of status, e.g. to tidy up old ones without them counting as
  "reviewed by an advisor." **Permanently delete** is the one operation that
  actually removes a row — gated the same way everything else in
  Administration is (the section-wide passcode; this app has no separate
  admin/manager role system — see "Permissions model").

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

## Permissions model

This app has no login (see Security model below), so "permissions" here
means **UI-level guidance, not enforcement** — a deliberate choice, since
building real per-advisor access control would mean adding an entire
authentication system this app has never had. Concretely:

- **Advisor** — their own dashboard and participant list only ever show
  their own caseload (`participants.advisor_id`); a transferred-away
  participant simply stops appearing there. They can see participants they
  originally supported who transferred to IWT via the read-only
  "Transferred to IWT" section (see above), which has no edit controls and
  no links into the editable profile — so there is no path *within the
  UI* from that view into editing a transferred participant.
- **IWT Advisor** — once a Trading Start transfers a participant, the
  participant appears in the new advisor's own caseload, editable exactly
  like any other participant of theirs.
- **Manager/Admin** — full access via the existing `/admin` and `/reports`
  passcode gate: approve/reject funding, transfer participants between
  advisors, view all offices, filter every report, manage Programme
  Settings. Reached from the home screen's Admin Login button, not by
  opening an advisor's workspace first (see "Two portals from one home
  screen" above) — the Advisor Portal's sidebar has never linked to
  `/admin` or `/reports` since the nav was split, so an advisor going about
  their normal work never sees those options. This is still nav-level
  separation, not access control: the underlying passcode gate is exactly
  as strict (or as loose) as it was before.

**What this does not do:** consistent with this app's existing, deliberate
"any advisor can open any other advisor's workspace" design (e.g. to cover
a colleague's caseload while they're away — see Organisation structure
above), nothing stops an advisor from directly navigating to
`/advisors/<other-advisor-id>/participants/<id>` and editing a participant
that isn't theirs, transferred or not — there was no such restriction in
this app before this feature set, and adding one selectively for
transferred participants only would be inconsistent with how every other
participant in the app already works. Enforcing "cannot edit transferred
participants" as a hard rule would require the same real authentication
system called out in the Security model below.

## Security model

There is no per-advisor authentication. `/advisors/<id>/...` is just a URL —
anyone who opens the app can navigate into any advisor's workspace by
clicking their card; this is intentional (see Organisation structure above),
not an oversight. Row-level security is disabled on every table, so **the
Supabase anon key (shipped in the browser bundle) has full read/write access
to all participant data, independent of workspace-based navigation.**

The Administration panel and Reports (`/admin`, `/reports` — together the
Management Portal) sit behind a single **shared passcode**
(`ADMIN_PASSCODE`, set once as an environment variable) rather than
individual accounts — consistent with the rest of the app's no-login model,
but keeping org-structure changes and cross-office reporting out of casual
reach. The Admin Login button on the home screen and the gate itself are
the same mechanism as before this section was renamed "Management Portal"
— only the entry point moved, not the authentication. Entering the correct
passcode sets a signed, httpOnly, 8-hour session cookie (shared by both
`/admin` and `/reports`, so logging in once covers both); there's a
"Log out" link in the Management Portal header. If `ADMIN_PASSCODE` isn't
set, the gate always rejects every passcode (rather than failing open).

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
`funding-documents` / `income-tracker-declarations` storage buckets.

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
- `src/app/select-advisor` — the home screen: dynamic advisor cards, search,
  office filter, and the Admin Login button that leads to the Management
  Portal (`src/app/page.tsx` redirects `/` here).
- `src/app/advisors/[advisorId]` — one advisor's workspace: layout/nav
  shell, dashboard, participants list, and participant create/edit/profile
  pages, all scoped to the `advisorId` route segment (the advisor's UUID,
  not their name — so display names can be renamed or reused across offices
  without breaking anything).
- `src/lib/data/advisor.ts` — the single source of truth for advisor/office
  lookups: `getAdvisorOrNotFound`, `listAdvisors`, `listOffices`,
  `getAdvisorCaseloadCounts`. Every part of the app that needs to know about
  advisors or offices goes through this file.
- `src/app/admin` — the Admin Dashboard (offices, advisors, transfer
  participants, Funding Approval Queue, Programme Settings, Announcements,
  Organisation Settings), gated by `src/components/admin-gate.tsx` /
  `src/lib/admin-auth.ts`. Shares `src/components/admin-shell.tsx` (now just
  two nav items: Admin Dashboard, Reports) with `/reports` — together these
  two routes are the Management Portal. Server actions in
  `src/lib/actions/admin.ts`, `src/lib/actions/transfer.ts` and
  `src/lib/actions/funding.ts` (approve/reject); data layer in
  `src/lib/data/funding-approvals.ts`.
- `src/lib/journey-timeline.ts`, `src/components/participant/journey-timeline.tsx`
  — the Participant Journey Timeline's milestone computation engine
  (`computeJourneyTimeline`, `MILESTONE_BUILDERS`) and its click-to-expand
  UI; composed into `src/components/participant/journey-tab.tsx` alongside
  the preserved (collapsed) Business Readiness Stage stepper.
- `src/lib/data/advisor-workqueue.ts`, `src/lib/actions/last-visit.ts`,
  `src/components/touch-last-visit.tsx` — the general Advisor Dashboard's
  work-queue data layer (`getAdvisorWorkQueue`) and the "since last visit"
  cookie proxy (explicitly not a login/session mechanism — see Self
  Employment Dashboard above).
- `src/lib/data/announcements.ts`, `src/lib/actions/announcements.ts`,
  `src/components/admin/announcements-manager.tsx`,
  `src/app/admin/announcements` — the Announcements feature.
- `src/lib/data/organisation-settings.ts`, `src/lib/actions/organisation-settings.ts`,
  `src/components/admin/organisation-settings-form.tsx`,
  `src/app/admin/organisation-settings`, `src/components/brand-mark.tsx` —
  Organisation Branding Settings: data layer, server actions (including logo
  upload/removal), the admin form, and the shared logo component used
  throughout the app's chrome.
- `src/app/reports`, `src/lib/data/reports.ts` — the Manager Dashboard
  (company-wide reporting, Office Reporting, the Office/Advisor/Date Range
  filters in `src/components/reports/report-filters.tsx`); same passcode
  gate as `/admin`.
- `src/lib/business-rules.ts` — Gateway/Gainful checklist %, business health
  scores, RAG suggestion, income trend (from the Income Tracker) and
  appointment/action-derived facts (next appointment, last contact, days
  until Gateway) — all computed, nothing stored twice. Reused by both
  individual participant profiles and the company-wide Reports page.
- `src/lib/next-best-action.ts` — the deterministic Next Best Action engine.
- `src/lib/actions` — server actions for participants, business plans,
  the Income Tracker, evidence, action plan items, appointments, the
  business journey stage, RAG/health confidence, Gateway/Gainful checklists,
  funding (including the approval workflow), HMRC info, digital presence,
  and the AI assistant.
- `src/lib/data-sync` — the source-agnostic import engine: file parsing
  (`.xlsx`/`.csv`), field-mapping suggestions, date normalization, row
  validation, and participant matching. `src/lib/actions/data-sync.ts` wraps
  it for the UI (preview, run import, saved mappings, history, dashboard
  stats) and resolves advisor names in imported rows against the live
  `advisors` table.
- `src/app/advisors/[advisorId]/data-sync` — Sync Dashboard, Import wizard,
  Import History (+ per-batch detail), and Field Mappings pages.
- `src/app/portal`, `src/components/portal` — the standalone, public
  Participant Income Tracker Portal. Deliberately outside every other
  layout (no AppShell, no nav) — this is the one part of the app a
  participant should ever reach. Server actions in
  `src/lib/actions/portal.ts`; mileage calculation in `src/lib/mileage.ts`.
- `src/app/advisors/[advisorId]/notifications`, `src/lib/data/notifications.ts`,
  `src/lib/actions/notifications.ts`, `src/components/notifications/notification-queue.tsx`
  — the live Notifications work queue (see the "Notifications" section
  above): status lifecycle, dedupe-guarded creation, the panel itself. The
  nav sidebar's badge reads `getActiveNotificationCount` from the same data
  layer. `src/lib/data/notification-rules.ts` is the lazy/computed-condition
  sync engine (Trading Start eligibility, upcoming reviews), called from the
  Dashboard and Notifications pages. Event-driven notification creation
  lives inside the server action that causes each event:
  `src/lib/actions/portal.ts` (income submitted), `src/lib/actions/funding.ts`
  (funding approval/decision), `src/lib/actions/trading-start.ts`
  (transferred to IWT, outcome achieved, eligibility auto-resolve). Admin
  side: `src/app/admin/notifications`,
  `src/components/admin/notification-history-filters.tsx`,
  `src/components/admin/notification-history-list.tsx`.
- `src/lib/supabase` — Supabase client helpers.
- `integrations/google-apps-script` — reference copy of the Apps Script
  function that syncs the external client income tracker form into the
  CRM's Income Tracker tab. Not part of the Next.js app; paste it into the
  Apps Script project that already handles that form's Sheets/Drive writes.
