import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import type { Referral, ReferralStatus } from "@/types/database";

// Advisors offered on the external referral picker. Reuses the same
// activeOnly convention as the internal advisor picker (select-advisor
// page) so an advisor going Inactive automatically drops off both.
// "In Work" is excluded: it's the pseudo-advisor used for In Work
// Tracking case handoffs (iwt_advisor_id), not a person who should
// receive new Self Employment referrals.
export async function listReferralAdvisors(): Promise<{ id: string; name: string }[]> {
  const advisors = await listAdvisors({ activeOnly: true });
  return advisors.filter((a) => a.full_name !== "In Work").map((a) => ({ id: a.id, name: a.full_name }));
}

export async function listReferralsForAdvisor(
  advisorId: string,
  status?: ReferralStatus,
): Promise<Referral[]> {
  const supabase = await createClient();
  // Own referrals plus the shared "No preference" pool (advisor_id null) —
  // every advisor sees both in their Referrals tab.
  let query = supabase
    .from("referrals")
    .select("*")
    .or(`advisor_id.eq.${advisorId},advisor_id.is.null`)
    .order("submitted_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getReferralCountsForAdvisor(advisorId: string): Promise<Record<ReferralStatus, number>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referrals")
    .select("status")
    .or(`advisor_id.eq.${advisorId},advisor_id.is.null`);

  const counts: Record<ReferralStatus, number> = { new: 0, accepted: 0, rejected: 0 };
  for (const row of data ?? []) {
    counts[row.status] += 1;
  }
  return counts;
}

// Duplicate-protection lookup for Accept — matches on the same
// external_participant_id column the CSV data-sync import engine already
// uses for de-duplication (see src/lib/data-sync/matching.ts), since this
// project has no separate "ENG" column on participants today.
export async function findParticipantByExternalId(
  externalId: string,
): Promise<{ id: string; ptp_name: string; advisor_id: string; advisor_name: string } | null> {
  const supabase = await createClient();
  const { data: participant } = await supabase
    .from("participants")
    .select("id, ptp_name, advisor_id")
    .eq("external_participant_id", externalId)
    .maybeSingle();

  if (!participant) return null;

  const { data: advisor } = await supabase
    .from("advisors")
    .select("full_name")
    .eq("id", participant.advisor_id)
    .maybeSingle();

  return {
    id: participant.id,
    ptp_name: participant.ptp_name,
    advisor_id: participant.advisor_id,
    advisor_name: advisor?.full_name ?? "Unknown advisor",
  };
}
