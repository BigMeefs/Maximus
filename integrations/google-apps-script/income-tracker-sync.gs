/**
 * Feeds each Income Tracker form submission into the Self Employment CRM
 * (Supabase), in addition to the existing Google Sheets / Drive writes.
 *
 * SETUP
 * 1. In the Apps Script editor: Project Settings -> Script Properties, add:
 *      SUPABASE_URL          = https://wxuuvpjmuqztgoazlgsa.supabase.co
 *      SUPABASE_ANON_KEY     = <the CRM's anon key>
 *    (Same values the CRM itself uses as NEXT_PUBLIC_SUPABASE_URL /
 *    NEXT_PUBLIC_SUPABASE_ANON_KEY — this project runs with Row Level
 *    Security disabled by design, so the anon key already has full
 *    read/write access; see the CRM's README "Security model" section.)
 *
 * 2. Call syncToCrm(...) from your existing doPost, AFTER your current
 *    Sheets/Drive writes, so a CRM hiccup never blocks the primary flow:
 *
 *      function doPost(e) {
 *        const data = JSON.parse(e.postData.contents); // however you parse today
 *
 *        // ... your existing Sheets + Drive writes stay exactly as they are ...
 *
 *        syncToCrm({
 *          email: data.email,
 *          date: data.date,             // any parseable date string, or a Date
 *          income: data.income,
 *          expense: data.expense,
 *          mileageCost: data.mileageCost,
 *          notes: data.notes,
 *        });
 *
 *        return ContentService.createTextOutput("OK");
 *      }
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
 */
function syncToCrm(fields) {
  try {
    const props = PropertiesService.getScriptProperties();
    const SUPABASE_URL = props.getProperty("SUPABASE_URL");
    const SUPABASE_ANON_KEY = props.getProperty("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      Logger.log("syncToCrm: SUPABASE_URL / SUPABASE_ANON_KEY script properties not set — skipping.");
      return;
    }

    const email = (fields.email || "").trim();
    if (!email) {
      Logger.log("syncToCrm: submission has no email — skipping.");
      return;
    }

    const participantId = findParticipantIdByEmail_(SUPABASE_URL, SUPABASE_ANON_KEY, email);
    if (!participantId) {
      Logger.log("syncToCrm: no CRM participant matches email " + email + " — skipping. " +
        "Add this email to their profile in the CRM, then future submissions will sync.");
      return;
    }

    upsertIncomeEntry_(SUPABASE_URL, SUPABASE_ANON_KEY, participantId, fields);
    Logger.log("syncToCrm: synced entry for " + email + " (participant " + participantId + ").");
  } catch (err) {
    // Never let a CRM sync failure break the primary Sheets/Drive flow.
    Logger.log("syncToCrm: failed — " + err);
  }
}

function findParticipantIdByEmail_(baseUrl, anonKey, email) {
  const url = baseUrl + "/rest/v1/participants?select=id&email=ilike." + encodeURIComponent(email);

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      apikey: anonKey,
      Authorization: "Bearer " + anonKey,
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() >= 300) {
    throw new Error("participant lookup failed: " + response.getContentText());
  }

  const rows = JSON.parse(response.getContentText());
  return rows.length > 0 ? rows[0].id : null;
}

function upsertIncomeEntry_(baseUrl, anonKey, participantId, fields) {
  const entryDate = toIsoDate_(fields.date);
  const month = entryDate.slice(0, 7) + "-01";

  const url = baseUrl + "/rest/v1/income_tracker_entries?on_conflict=participant_id,month";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey: anonKey,
      Authorization: "Bearer " + anonKey,
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
