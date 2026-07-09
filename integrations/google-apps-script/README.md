# Client Income Tracker → CRM sync

`income-tracker-sync.gs` is a reference copy of the Apps Script function that
feeds each submission from the client income tracker form (Netlify HTML form
→ this Apps Script `doPost` → Google Sheets/Drive) into the Self Employment
CRM's **Income Tracker** tab, in addition to the existing Sheets/Drive
writes.

This file isn't executed by the Next.js app — it's Google Apps Script,
version-controlled here for reference since it integrates with this CRM's
database. To use it, paste it into your existing Apps Script project
alongside your current `doPost`.

## Setup

1. Paste `income-tracker-sync.gs` into your Apps Script project. `SUPABASE_URL`
   and `SUPABASE_ANON_KEY` are already filled in at the top of the file —
   this project runs with Row Level Security disabled by design (see the
   main README's "Security model" section), so the anon key is already
   public in the CRM's own browser bundle; hardcoding it here doesn't expose
   anything new.

2. Call `syncToCrm(...)` from your existing `doPost`, **after** your current
   Sheets/Drive writes, so a CRM hiccup never blocks the primary flow:

   ```js
   function doPost(e) {
     const data = JSON.parse(e.postData.contents); // however you parse today

     // ... your existing Sheets + Drive writes stay exactly as they are ...

     syncToCrm({
       email: data.email,
       date: data.date, // any parseable date string, or a Date
       income: data.income,
       expense: data.expense,
       mileageCost: data.mileageCost,
       notes: data.notes,
     });

     return ContentService.createTextOutput("OK");
   }
   ```

   Adjust the `data.xxx` field names to match whatever your form actually
   posts — `syncToCrm` only cares about the object shape shown above.

## Behaviour

- Matches a submission to a CRM participant **by email** (case-insensitive).
  If no participant has that email yet, the submission is skipped and
  logged — it does **not** auto-create a participant, since the CRM
  requires a name, business name, advisor and scheme start date that this
  form doesn't collect. Add the participant's email on their CRM profile
  (Participants → the participant → Edit → Email) first, then future
  submissions will sync.
- On a match, the entry is upserted into the participant's **Income
  Tracker** tab, keyed by (participant, calendar month of the date).
  Submitting again in the same month **replaces** that month's figures —
  the same behaviour as the CRM's own Monthly Performance tab.
- Kept as its own table/tab (`income_tracker_entries`), separate from the
  advisor-managed Monthly Performance tab, so the two data sources never
  silently overwrite each other.
- Net Profit isn't stored — the CRM computes it live as
  `Income − Expense − Mileage Cost`, consistent with how every other
  computed figure in this CRM works.
- Never throws back into your `doPost`: any Supabase/network failure is
  caught and logged, so the existing Sheets/Drive write always succeeds
  regardless of CRM sync outcome.
- `syncToCrm(...)` returns `{ status, detail }`, where `status` is one of
  `"synced"`, `"skipped_no_email"`, `"skipped_no_match"` or `"error"`. Use
  this in your `doPost` if you want visibility (write it to a spare column
  on the row, email yourself on `"error"`, etc.) without opening Apps
  Script's Executions log each time.

## Troubleshooting: submissions aren't showing up in the CRM

1. **Run `testSyncToCrm()` directly.** In the Apps Script editor, put a real
   participant's email (from their CRM profile) into `testSyncToCrm()` at
   the top of `income-tracker-sync.gs`, select it in the function dropdown,
   and click Run. Check View → Logs for the result. This exercises the
   exact same code path as a real form submission, so it tells you
   immediately whether the problem is in the CRM sync code, or somewhere
   upstream of it (your `doPost`/form).
2. **Redeploy after any edit.** Editing the script does **not** update what
   a live "Web app" deployment URL runs — you have to go to Deploy → Manage
   deployments → Edit the active deployment → select "New version" → Deploy.
   This is the single most common reason a working `syncToCrm(...)` call
   never actually runs against real submissions: it was added to the
   script, but the deployment serving the form was never updated.
3. **Check the participant has an email set in the CRM.** Matching is
   strictly by email (Participants → the participant → Edit → Email) — a
   submission from an address that doesn't match any participant is
   silently skipped by design (`status: "skipped_no_match"`), not an error.
4. **Check Executions** (View → Executions) after a real form submission,
   if the above two don't explain it — filter to `doPost` and look for
   whether `syncToCrm` ran at all and what it logged.
