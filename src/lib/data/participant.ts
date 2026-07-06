import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getParticipantDetail(participantId: string) {
  const supabase = await createClient();

  const [
    participantRes,
    businessPlanRes,
    monthlyEarningsRes,
    evidenceFilesRes,
    actionPlanRes,
    appointmentsRes,
  ] = await Promise.all([
    supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .single(),
    supabase
      .from("business_plans")
      .select("*")
      .eq("participant_id", participantId)
      .maybeSingle(),
    supabase
      .from("monthly_earnings")
      .select("*")
      .eq("participant_id", participantId)
      .order("month", { ascending: true }),
    supabase
      .from("evidence_files")
      .select("*")
      .eq("participant_id", participantId)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("action_plan_items")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("*")
      .eq("participant_id", participantId)
      .order("appointment_date", { ascending: false }),
  ]);

  if (!participantRes.data) {
    notFound();
  }

  return {
    participant: participantRes.data,
    businessPlan: businessPlanRes.data,
    monthlyEarnings: monthlyEarningsRes.data ?? [],
    evidenceFiles: evidenceFilesRes.data ?? [],
    actionPlanItems: actionPlanRes.data ?? [],
    appointments: appointmentsRes.data ?? [],
  };
}
