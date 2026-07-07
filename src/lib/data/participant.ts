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
    fundingRecordsRes,
    hmrcRes,
    digitalPresenceRes,
    gatewayChecklistRes,
    gainfulRes,
    incomeTrackerEntriesRes,
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
    supabase
      .from("funding_records")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("hmrc_business_info")
      .select("*")
      .eq("participant_id", participantId)
      .maybeSingle(),
    supabase
      .from("digital_presence_items")
      .select("*")
      .eq("participant_id", participantId),
    supabase
      .from("gateway_checklist_items")
      .select("*")
      .eq("participant_id", participantId),
    supabase
      .from("gainful_assessments")
      .select("*")
      .eq("participant_id", participantId)
      .maybeSingle(),
    supabase
      .from("income_tracker_entries")
      .select("*")
      .eq("participant_id", participantId)
      .order("month", { ascending: true }),
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
    fundingRecords: fundingRecordsRes.data ?? [],
    hmrc: hmrcRes.data,
    digitalPresence: digitalPresenceRes.data ?? [],
    gatewayChecklist: gatewayChecklistRes.data ?? [],
    gainful: gainfulRes.data,
    incomeTrackerEntries: incomeTrackerEntriesRes.data ?? [],
  };
}
