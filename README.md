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
- **Journey** — the 10-stage business journey (Idea → ... → Gainful
  Decision) as a visual timeline; advisors move participants forward with a
  click. There's no separate "Gainful Assessment" stage — a Gateway now
  covers that assessment, so the stage most participants at that point in
  the journey used to sit at is retired; nothing else about the timeline
  changed, and no participant currently sits on the retired stage (verified
  before removing it — the underlying Postgres enum was rebuilt without it).
- **Gateway** — one combined page (previously two separate tabs: "Gateway"
  and "Gainful Decision"), presented as two clearly separated cards so it
  reads as a single workflow:
  - **Gateway Assessment** — the 16-item readiness checklist (eight
    auto-derived from data entered elsewhere, the rest manual checkboxes)
    with a live readiness %, the participant's Gateway target date, and a
    free-text Advisor Notes field (new — previously nothing captured this).
  - **Gainful Decision** — trading consistency, auto income trend,
    evidence, invoices, bank statements and customer base feed a readiness
    %; a Supporting Evidence list (reads from the same Evidence Vault
    records, not a separate upload); advisor recommendation, manager
    approval, manager notes, a Decision Date (new — previously only
    implied by a last-updated timestamp), and the Gainful Outcome (the
    overall 🟢/🟡/🔴 recommendation).

  Nothing from either original tab was removed — every existing field,
  checkbox and value carried over unchanged into its respective card.
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

The **general** advisor dashboard (`/advisors/<id>/dashboard`) — My
Caseload, expiring participants, missing business plans, outstanding
actions — also shows two more live widgets: **Funding**, this advisor's
own participants' funding requests currently awaiting manager approval plus
recently-decided ones; and **Income Tracker alerts**, Active participants
who haven't logged an Income Tracker entry for the current calendar month.
Both link straight into the relevant participant tab.

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

"Notifications" here means **unreviewed Participant Portal submissions**,
computed live from `income_tracker_entries` filtered to
`source = 'Participant Portal'` — there's no separate notifications table
to keep in sync with the entries themselves.

- A **Notifications** link in the sidebar nav shows a live unread badge
  (this advisor's own unreviewed submissions) and opens
  `/advisors/<id>/notifications` — every Portal submission, newest first,
  filterable by Advisor, Office, Date and Reviewed/Unreviewed status (the
  same Office/Advisor filter pattern as Reports). Each row shows the
  participant, email, submission date, Net Profit and status, with
  **Mark as Reviewed**, **Open submission** (into the participant's Income
  Tracker tab) and **View declaration** (a signed URL, if one was uploaded).
  Marking a submission reviewed records who (the advisor whose workspace
  you're viewing it from — this route already carries that context, same
  as the rest of the advisor-scoped app) and when.
- The **Self Employment Dashboard** also shows a compact "Income Tracker
  Submissions" list of this advisor's own unreviewed submissions, and a
  **Participant Income Tracker Portal** card at the top with a QR code
  (generated server-side from the request's own host, so it doesn't need a
  hardcoded production URL) and a copyable link — print it or email it to
  participants.
- On the participant's own profile, the existing **Income Tracker** tab is
  where every submission "automatically appears" — it already lists every
  entry with month, date, income, expense, and now Miles, a Status badge
  (Awaiting advisor review / Reviewed by X) and a declaration link where
  present, rather than a separate new cross-cutting "Participant Timeline"
  view merging every event type in the app (appointments, status changes,
  income entries, etc.) — that would have been a much larger, separately-
  scoped feature than what was asked for here.

### Security caveat

This does **not** add real access control beyond what already exists (or
doesn't) in this project — see "Security model" below. The portal page and
its server actions are written to only ever return the minimum a
participant should see (a first name on match, nothing on no match, and
the lookup/submit actions never return a participant record), but RLS is
disabled and the anon key is public by design, so anyone calling Supabase's
REST API directly still has the same full read/write access they always
did, independent of this page's own restraint.

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
  participants, Funding Approval Queue, Programme Settings), gated by
  `src/components/admin-gate.tsx` / `src/lib/admin-auth.ts`. Shares
  `src/components/admin-shell.tsx` (now just two nav items: Admin
  Dashboard, Reports) with `/reports` — together these two routes are the
  Management Portal. Server actions in `src/lib/actions/admin.ts`,
  `src/lib/actions/transfer.ts` and `src/lib/actions/funding.ts`
  (approve/reject); data layer in `src/lib/data/funding-approvals.ts`.
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
- `src/app/advisors/[advisorId]/notifications`,
  `src/lib/data/notifications.ts` — the advisor-facing review queue for
  Portal submissions (computed from `income_tracker_entries`, not a
  separate table); the nav sidebar's unread badge reads from the same data
  layer.
- `src/lib/supabase` — Supabase client helpers.
- `integrations/google-apps-script` — reference copy of the Apps Script
  function that syncs the external client income tracker form into the
  CRM's Income Tracker tab. Not part of the Next.js app; paste it into the
  Apps Script project that already handles that form's Sheets/Drive writes.
