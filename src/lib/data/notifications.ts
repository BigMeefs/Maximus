import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { netProfit } from "@/lib/trading-start-rules";
import type { IncomeTrackerEntry } from "@/types/database";

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
