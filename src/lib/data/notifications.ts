import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { netProfit } from "@/lib/trading-start-rules";
import {
  ACTIVE_NOTIFICATION_STATUSES,
  type IncomeTrackerEntry,
  type Notification,
  type NotificationStatus,
  type NotificationType,
} from "@/types/database";

// "Notifications" here means Income Tracker Portal submissions awaiting (or
// having received) advisor review — computed live from
// income_tracker_entries where source = 'Participant Portal', not a
// separate notifications table. This keeps a single source of truth for
// submission data (the entry itself) rather than duplicating it into a
// second record that could drift out of sync, consistent with how the rest
// of this CRM avoids storing anything that can be computed from data it
// already has.
export type IncomeSubmissionRow = {
  entry: IncomeTrackerEntry;
  participantId: string;
  participantName: string;
  participantEmail: string | null;
  advisorId: string;
  advisorName: string;
  officeName: string;
  netProfit: number;
};

export type SubmissionFilters = {
  advisorId?: string;
  officeId?: string;
  from?: string;
  to?: string;
  reviewed?: boolean;
};

export async function getIncomeSubmissions(filters?: SubmissionFilters): Promise<IncomeSubmissionRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("income_tracker_entries")
    .select("*")
    .eq("source", "Participant Portal")
    .order("created_at", { ascending: false });

  if (filters?.reviewed !== undefined) {
    query = query.eq("reviewed", filters.reviewed);
  }
  if (filters?.from) {
    query = query.gte("entry_date", filters.from);
  }
  if (filters?.to) {
    query = query.lte("entry_date", filters.to);
  }

  const [{ data: entries }, advisors] = await Promise.all([query, listAdvisors()]);
  const rows = entries ?? [];

  const participantIds = [...new Set(rows.map((e) => e.participant_id))];
  const { data: participants } = participantIds.length
    ? await supabase.from("participants").select("id, ptp_name, email, advisor_id").in("id", participantIds)
    : { data: [] };

  const participantById = new Map((participants ?? []).map((p) => [p.id, p]));
  const advisorById = new Map(advisors.map((a) => [a.id, a]));

  const allowedAdvisorIds = filters?.advisorId
    ? new Set([filters.advisorId])
    : filters?.officeId
      ? new Set(advisors.filter((a) => a.office_id === filters.officeId).map((a) => a.id))
      : null;

  return rows
    .map((entry) => {
      const participant = participantById.get(entry.participant_id);
      const advisor = participant ? advisorById.get(participant.advisor_id) : undefined;
      return {
        entry,
        participantId: entry.participant_id,
        participantName: participant?.ptp_name ?? "Unknown participant",
        participantEmail: participant?.email ?? null,
        advisorId: participant?.advisor_id ?? "",
        advisorName: advisor?.full_name ?? "Unknown advisor",
        officeName: advisor?.office_name ?? "Unknown office",
        netProfit: netProfit(entry),
      };
    })
    .filter((row) => !allowedAdvisorIds || allowedAdvisorIds.has(row.advisorId));
}

export async function getUnreviewedCountForAdvisor(advisorId: string): Promise<number> {
  const supabase = await createClient();

  const { data: participants } = await supabase.from("participants").select("id").eq("advisor_id", advisorId);
  const participantIds = (participants ?? []).map((p) => p.id);
  if (participantIds.length === 0) return 0;

  const { count } = await supabase
    .from("income_tracker_entries")
    .select("id", { count: "exact", head: true })
    .eq("source", "Participant Portal")
    .eq("reviewed", false)
    .in("participant_id", participantIds);

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Notifications — the live advisor work queue (supabase/migrations/0018_notifications.sql).
// Unlike the submission rows above, these are real, persisted, status-driven
// records: created once by a business rule or a server action, updated as
// they're actioned, never deleted except by an explicit admin request. See
// src/lib/data/notification-rules.ts for the "lazy" (computed-condition)
// rules, and README "Notifications" for the full design.
// ---------------------------------------------------------------------------

export async function createNotification(input: {
  type: NotificationType;
  status?: NotificationStatus;
  title: string;
  body: string;
  participantId?: string | null;
  advisorId?: string | null;
  relatedId?: string | null;
  dedupeKey?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    type: input.type,
    status: input.status ?? "New",
    title: input.title,
    body: input.body,
    participant_id: input.participantId ?? null,
    advisor_id: input.advisorId ?? null,
    related_id: input.relatedId ?? null,
    dedupe_key: input.dedupeKey ?? null,
  });

  // 23505 = unique_violation on the active-dedupe partial index — an active
  // notification for this exact unresolved event already exists, which is
  // exactly the "don't duplicate" requirement working as intended, not a
  // real error.
  if (error && error.code !== "23505") {
    console.error("createNotification error:", error);
  }
}

// Resolves (never deletes) every active notification of `type` pointing at
// `relatedId` — used when the record a notification refers to (an income
// entry, a funding request, ...) is itself actioned elsewhere.
export async function resolveNotificationByRelatedId(
  relatedId: string,
  type: NotificationType,
  resolvedBy: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ status: "Reviewed", reviewed_by: resolvedBy, reviewed_at: new Date().toISOString() })
    .eq("related_id", relatedId)
    .eq("type", type)
    .in("status", ACTIVE_NOTIFICATION_STATUSES);
}

// Resolves every active notification of any of `types` for a participant —
// used when a single advisor action (e.g. creating a Trading Start) should
// clear out every eligibility notification for that participant at once,
// regardless of which specific rule(s) had matched.
export async function resolveNotificationsForParticipant(
  participantId: string,
  types: NotificationType[],
  resolvedBy: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ status: "Reviewed", reviewed_by: resolvedBy, reviewed_at: new Date().toISOString() })
    .eq("participant_id", participantId)
    .in("type", types)
    .in("status", ACTIVE_NOTIFICATION_STATUSES);
}

export async function getActiveNotificationsForAdvisor(advisorId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("advisor_id", advisorId)
    .in("status", ACTIVE_NOTIFICATION_STATUSES)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getActiveNotificationCount(advisorId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("advisor_id", advisorId)
    .in("status", ACTIVE_NOTIFICATION_STATUSES);

  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Admin Notification History — every notification ever created, regardless
// of status, with full-text search and the filters the Admin Dashboard's
// History page offers. Capped at HISTORY_LIMIT most-recent rows rather than
// paginated, consistent with this CRM's scale (see README).
// ---------------------------------------------------------------------------
const HISTORY_LIMIT = 300;

export type NotificationHistoryFilters = {
  officeId?: string;
  advisorId?: string;
  participantId?: string;
  participantName?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  from?: string;
  to?: string;
  search?: string;
};

export type NotificationHistoryRow = Notification & {
  participantName: string;
  advisorName: string;
  officeName: string;
};

export async function getNotificationHistory(
  filters?: NotificationHistoryFilters,
): Promise<NotificationHistoryRow[]> {
  const supabase = await createClient();

  let query = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(HISTORY_LIMIT);
  if (filters?.advisorId) query = query.eq("advisor_id", filters.advisorId);
  if (filters?.participantId) query = query.eq("participant_id", filters.participantId);
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.from) query = query.gte("created_at", filters.from);
  if (filters?.to) query = query.lte("created_at", `${filters.to}T23:59:59`);

  const [{ data: rows }, advisors, { data: participants }] = await Promise.all([
    query,
    listAdvisors(),
    supabase.from("participants").select("id, ptp_name"),
  ]);

  const advisorById = new Map(advisors.map((a) => [a.id, a]));
  const participantNameById = new Map((participants ?? []).map((p) => [p.id, p.ptp_name]));

  const allowedAdvisorIds = filters?.officeId
    ? new Set(advisors.filter((a) => a.office_id === filters.officeId).map((a) => a.id))
    : null;

  const needle = filters?.search?.trim().toLowerCase();

  return (rows ?? [])
    .filter((n) => !allowedAdvisorIds || (n.advisor_id !== null && allowedAdvisorIds.has(n.advisor_id)))
    .map((n) => {
      const advisor = n.advisor_id ? advisorById.get(n.advisor_id) : undefined;
      return {
        ...n,
        participantName: (n.participant_id && participantNameById.get(n.participant_id)) || "—",
        advisorName: advisor?.full_name ?? "—",
        officeName: advisor?.office_name ?? "—",
      } satisfies NotificationHistoryRow;
    })
    .filter((row) => {
      if (!needle) return true;
      return (
        row.title.toLowerCase().includes(needle) ||
        row.body.toLowerCase().includes(needle) ||
        row.participantName.toLowerCase().includes(needle)
      );
    })
    .filter((row) => {
      if (!filters?.participantName) return true;
      return row.participantName.toLowerCase().includes(filters.participantName.trim().toLowerCase());
    });
}
