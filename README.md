# Self Employment Caseload Manager

A CRM-style caseload manager for advisors (Kyle, Charles, Elliott, Aroosa) who
support participants running their own self-employment schemes. Built with
Next.js (App Router), TypeScript, Tailwind CSS and Supabase.

## Features

- Advisor authentication — each advisor can only view and edit their own
  participants (enforced by Postgres row-level security).
- Participant profiles: PTP name, business name, advisor, previous advisor,
  scheme start date, calculated days remaining (365-day scheme), website and
  social media links.
- Business plan tracker (Not Started / In Progress / Complete) with optional
  document upload.
- Monthly earnings with an editable table and chart view.
- Evidence library with upload, view, delete and upload timestamps.
- Ongoing action plan tracker with full history.
- Appointment history (date, advisor, notes, outcome).
- Dashboard with caseload size, expiring participants, missing business plans
  and outstanding actions.
- Searchable, filterable, responsive participant list.

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

This creates all tables, row-level security policies, and the
`business-plans` / `evidence-files` storage buckets.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 4. Seed the four advisor accounts

The app authenticates advisors by name + password (email is derived as
`<name>@caseload.local` internally). Create the four accounts once with the
service role key (found in Project Settings → API — keep this secret):

```bash
SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... ADVISOR_PASSWORD=... \
  node scripts/seed-advisors.mjs
```

This creates Kyle, Charles, Elliott and Aroosa with the same starter
password — advisors can change it later via Supabase Auth if needed.

### 5. Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in as one of the
four advisors.

## Project structure

- `supabase/migrations` — SQL schema, RLS policies and storage buckets.
- `scripts/seed-advisors.mjs` — one-off script to create advisor accounts.
- `src/app/login` — advisor sign-in.
- `src/app/(app)` — authenticated app shell, dashboard, participants and
  participant profile tabs.
- `src/lib/actions` — server actions for business plans, earnings, evidence,
  action plan items and appointments.
- `src/lib/supabase` — Supabase client helpers (browser, server, middleware).
