import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import type { FundingRecord } from "@/types/database";

export type FundingApprovalRow = {
  record: FundingRecord;
  participantId: string;
  participantName: string;
  advisorId: string;
  advisorName: string;
  officeName: string;
};

export async function getFundingApprovalQueue(): Promise<FundingApprovalRow[]> {
  const supabase = await createClient();

  const [{ data: records }, advisors] = await Promise.all([
    supabase
      .from("funding_records")
      .select("*")
      .eq("application_status", "Pending Manager Approval")
      .order("created_at", { ascending: true }),
    listAdvisors(),
  ]);

  const rows = records ?? [];
  const participantIds = [...new Set(rows.map((r) => r.participant_id))];

  const { data: participants } = participantIds.length
    ? await supabase.from("participants").select("id, ptp_name, advisor_id").in("id", participantIds)
    : { data: [] };

  const participantById = new Map((participants ?? []).map((p) => [p.id, p]));
  const advisorById = new Map(advisors.map((a) => [a.id, a]));

  return rows.map((record) => {
    const participant = participantById.get(record.participant_id);
    const advisor = participant ? advisorById.get(participant.advisor_id) : undefined;
    return {
      record,
      participantId: record.participant_id,
      participantName: participant?.ptp_name ?? "Unknown participant",
      advisorId: participant?.advisor_id ?? "",
      advisorName: advisor?.full_name ?? "Unknown advisor",
      officeName: advisor?.office_name ?? "Unknown office",
    };
  });
}
