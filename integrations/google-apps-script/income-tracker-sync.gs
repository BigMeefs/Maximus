/**
 * Feeds each Income Tracker form submission into the Self Employment CRM
 * (Supabase), in addition to the existing Google Sheets / Drive writes.
 *
 * SETUP
 * Call syncToCrm(...) from your existing doPost, AFTER your current
 * Sheets/Drive writes, so a CRM hiccup never blocks the primary flow:
 *
 *   function doPost(e) {
 *     const data = JSON.parse(e.postData.contents); // however you parse today
 *
 *     // ... your existing Sheets + Drive writes stay exactly as they are ...
 *
 *     const result = syncToCrm({
 *       email: data.email,
 *       date: data.date,             // any parseable date string, or a Date
 *       income: data.income,
 *       expense: data.expense,
 *       mileageCost: data.mileageCost,
 *       notes: data.notes,
 *     });
 *     // result.status is one of: "synced", "skipped_no_email",
 *     // "skipped_no_match", "error" — write it into a spare column on the
 *     // row, or email yourself on "error", if you want visibility without
 *     // opening Executions each time. result.detail has the reason/message.
 *
 *     return ContentService.createTextOutput("OK");
 *   }
 *
 * TROUBLESHOOTING — if submissions land in Sheets but never appear in the
 * CRM, run testSyncToCrm() below (Apps Script editor → select it in the
 * function dropdown → Run) with a real participant email from the CRM. That
 * calls the exact same code path as a live form submission, and prints a
 * clear pass/fail result straight into the console (View → Logs) — no need
 * to wait for a real submission or dig through Executions. The two most
 * common causes of "nothing ever syncs":
 *   1. syncToCrm(...) was added to the script but the web app deployment
 *      was never updated (Deploy → Manage deployments → Edit the active
 *      deployment → New version). Editing the script does NOT change what
 *      a live "Web app" URL runs until you redeploy it.
 *   2. The participant's email isn't set on their CRM profile yet
 *      (Participants → the participant → Edit → Email) — matching is
 *      strictly by email, so a submission from an unmatched address is
 *      silently skipped by design (see BEHAVIOUR below), not an error.
 *
 * BEHAVIOUR
 * - Matches the submission to a CRM participant by email (case-insensitive).
 *   If nobody matches yet, the submission is skipped and logged — it is NOT
 *   used to auto-create a participant, since the CRM requires a name,
 *   business name, advisor and scheme start date that this form doesn't
 *   collect. Add the participant's email on their CRM profile first.
 * - On a match, the entry is upserted into the CRM's Income Tracker tab,
 *   keyed by (participant, calendar month of the date). Submitting again in
 *   the same month REPLACES that month's figures — same behaviour as the
 *   CRM's own Monthly Performance tab.
 * - Never throws: any Supabase/network failure is caught and logged so your
 *   existing Sheets/Drive write always succeeds regardless of CRM sync
 *   outcome.
 *
 * CONFIG
 * SUPABASE_ANON_KEY below is the CRM's public anon key — it's already
 * shipped in the CRM's own browser bundle by design (Row Level Security is
 * disabled on this project; see the CRM README's "Security model" section),
 * so hardcoding it here doesn't expose anything that isn't already public.
 */
const SUPABASE_URL = "https://wxuuvpjmuqztgoazlgsa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4dXV2cGptdXF6dGdvYXpsZ3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjc2NjEsImV4cCI6MjA5ODk0MzY2MX0.GmVBFKIZCgDhraRYGdNlwsxb6w3Bxu_76UatRpo22PM";

/**
 * Manual smoke test — run this directly from the Apps Script editor
 * (function dropdown → testSyncToCrm → Run) to check the whole CRM sync
 * path without waiting for a real form submission. Replace the email below
 * with a real participant's email from the CRM first (Participants → the
 * participant → their profile shows the email under the name).
 */
function testSyncToCrm() {
  const result = syncToCrm({
    email: "replace-with-a-real-participant-email@example.com",
    date: new Date(),
    income: 123.45,
    expense: 67.89,
    mileageCost: 0,
    notes: "testSyncToCrm() manual test",
  });
  Logger.log("testSyncToCrm result: " + JSON.stringify(result));
}

function syncToCrm(fields) {
  try {
    const email = (fields.email || "").trim();
    if (!email) {
      Logger.log("syncToCrm: submission has no email — skipping.");
      return { status: "skipped_no_email", detail: "Submission had no email." };
    }

    const participantId = findParticipantIdByEmail_(email);
    if (!participantId) {
      const detail =
        "No CRM participant matches email " + email + ". " +
        "Add this email to their profile in the CRM (Participants → the participant → Edit → Email), " +
        "then future submissions will sync.";
      Logger.log("syncToCrm: " + detail);
      return { status: "skipped_no_match", detail: detail };
    }

    upsertIncomeEntry_(participantId, fields);
    const detail = "Synced entry for " + email + " (participant " + participantId + ").";
    Logger.log("syncToCrm: " + detail);
    return { status: "synced", detail: detail };
  } catch (err) {
    // Never let a CRM sync failure break the primary Sheets/Drive flow.
    Logger.log("syncToCrm: failed — " + err);
    return { status: "error", detail: String(err) };
  }
}

function findParticipantIdByEmail_(email) {
  const url = SUPABASE_URL + "/rest/v1/participants?select=id&email=ilike." + encodeURIComponent(email);

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() >= 300) {
    throw new Error("participant lookup failed: " + response.getContentText());
  }

  const rows = JSON.parse(response.getContentText());
  return rows.length > 0 ? rows[0].id : null;
}

function upsertIncomeEntry_(participantId, fields) {
  const entryDate = toIsoDate_(fields.date);
  const month = entryDate.slice(0, 7) + "-01";

  const url = SUPABASE_URL + "/rest/v1/income_tracker_entries?on_conflict=participant_id,month";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    payload: JSON.stringify({
      participant_id: participantId,
      month: month,
      entry_date: entryDate,
      income: toNumber_(fields.income),
      expense: toNumber_(fields.expense),
      mileage_cost: toNumber_(fields.mileageCost),
      notes: fields.notes || null,
      source: "income-tracker",
    }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() >= 300) {
    throw new Error("income entry upsert failed: " + response.getContentText());
  }
}

function toNumber_(value) {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

// Accepts a Date object or a string and returns YYYY-MM-DD.
function toIsoDate_(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error("could not parse date: " + value);
  }
  return Utilities.formatDate(date, Session.getScriptTimeZone() || "Etc/UTC", "yyyy-MM-dd");
}
