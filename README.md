# Self Employment Caseload Manager

A CRM-style caseload manager for advisors (Kyle, Charles, Elliott, Aroosa) who
support participants running their own self-employment schemes. Built with
Next.js (App Router), TypeScript, Tailwind CSS and Supabase.

## Features

- No login. The home screen (`/select-advisor`) lists the four advisors as
  cards; picking one opens `/advisors/<name>/dashboard` — that advisor's own
  workspace.
- Each advisor's dashboard and participant list show only participants
  belonging to that workspace (`participants.advisor_name`). There's a link
  back to the home screen from every page ("← All advisors" in the sidebar),
  and any advisor can open any other advisor's workspace from there — e.g.
  if Charles is on holiday, Kyle can open `/advisors/Charles/dashboard` and
  work his caseload directly.
- Participant profiles: PTP name, business name, advisor (the workspace
  that created them), previous advisor, scheme start date, calculated days
  remaining (365-day scheme), website and social media links.
- Business plan tracker (Not Started / In Progress / Complete) with optional
  document upload.
- Monthly earnings with an editable table and chart view.
- Evidence library with upload, view, delete and upload timestamps.
- Ongoing action plan tracker with full history.
- Appointment history (date, advisor, notes, outcome).
- Dashboard with caseload size, expiring participants, missing business plans
  and outstanding actions, scoped to that workspace.
- Searchable, filterable, responsive participant list, scoped to that
  workspace.

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

This creates all tables and the `business-plans` / `evidence-files` storage
buckets.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 4. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick an advisor, and go.

### Deploying (e.g. Vercel)

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` also need to be
set as **Environment Variables on the hosting project itself** (Vercel:
Project Settings → Environment Variables) — `.env.local` is git-ignored and
never reaches a deployment. If they're missing, every page that talks to
Supabase (e.g. an advisor's dashboard) will fail to load. After adding or
changing them, redeploy — Next.js inlines these at build time, so an
existing deployment won't pick up new values on its own.

## Project structure

- `supabase/migrations` — SQL schema and storage buckets.
- `src/app/select-advisor` — the home screen (advisor selection cards).
- `src/app/advisors/[advisor]` — one advisor's workspace: layout/nav shell,
  dashboard, participants list, and participant create/edit/profile pages,
  all scoped to the `advisor` route segment.
- `src/lib/actions` — server actions for participants, business plans,
  earnings, evidence, action plan items and appointments.
- `src/lib/supabase` — Supabase client helpers.
