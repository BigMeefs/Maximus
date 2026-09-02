import { createClient } from "@/lib/supabase/server";
import type { Referral, ReferralStatus } from "@/types/database";

// Resolves a public referral link token to the advisor it belongs to.
// Returns null for an unknown/invalid token — the external page shows a
// generic "not valid" message either way, never which part failed.
export async function getAdvisorByReferralToken(
  token: string,
): Promise<{ advisorId: string; advisorName: string } | null> {
  const supabase = await createClient();

  const { data: tokenRow } = await supabase
    .from("advisor_referral_tokens")
    .select("advisor_id")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) return null;

  const { data: advisor } = await supabase
    .from("advisors")
    .select("full_name")
    .eq("id", tokenRow.advisor_id)
    .maybeSingle();

  if (!advisor) return null;

  return { advisorId: tokenRow.advisor_id, advisorName: advisor.full_name };
}

// The referral link for a given advisor — creates a token on the fly if
// this advisor somehow doesn't have one yet (shouldn't happen once the
// migration's backfill + insert trigger have run, but keeps the Referrals
// tab from ever showing a broken link).
export async function getOrCreateReferralToken(advisorId: string): Promise<string> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("advisor_referral_tokens")
    .select("token")
    .eq("advisor_id", advisorId)
    .maybeSingle();

  if (existing) return existing.token;

  const { data: created } = await supabase
    .from("advisor_referral_tokens")
    .insert({ advisor_id: advisorId })
    .select("token")
    .single();

  return created?.token ?? "";
}

export async function listReferralsForAdvisor(
  advisorId: string,
  status?: ReferralStatus,
): Promise<Referral[]> {
  const supabase = await createClient();
  let query = supabase
    .from("referrals")
    .select("*")
    .eq("advisor_id", advisorId)
    .order("submitted_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getReferralCountsForAdvisor(advisorId: string): Promise<Record<ReferralStatus, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("referrals").select("status").eq("advisor_id", advisorId);

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
