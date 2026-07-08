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
 *     syncToCrm({
 *       email: data.email,
 *       date: data.date,             // any parseable date string, or a Date
 *       income: data.income,
 *       expense: data.expense,
 *       mileageCost: data.mileageCost,
 *       notes: data.notes,
 *     });
 *
 *     return ContentService.createTextOutput("OK");
 *   }
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

function syncToCrm(fields) {
  try {
    const email = (fields.email || "").trim();
    if (!email) {
      Logger.log("syncToCrm: submission has no email — skipping.");
      return;
    }

    const participantId = findParticipantIdByEmail_(email);
    if (!participantId) {
      Logger.log("syncToCrm: no CRM participant matches email " + email + " — skipping. " +
        "Add this email to their profile in the CRM, then future submissions will sync.");
      return;
    }

    upsertIncomeEntry_(participantId, fields);
    Logger.log("syncToCrm: synced entry for " + email + " (participant " + participantId + ").");
  } catch (err) {
    // Never let a CRM sync failure break the primary Sheets/Drive flow.
    Logger.log("syncToCrm: failed — " + err);
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
