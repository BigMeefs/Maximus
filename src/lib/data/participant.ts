import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listAdvisors } from "@/lib/data/advisor";
import { getProgrammeSettings } from "@/lib/data/programme-settings";

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
    statusHistoryRes,
    tradingStartsRes,
    advisors,
    programmeSettings,
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
    supabase
      .from("participant_status_history")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("trading_starts")
      .select("*")
      .eq("participant_id", participantId)
      .order("created_at", { ascending: false }),
    listAdvisors(),
    getProgrammeSettings(),
  ]);

  if (!participantRes.data) {
    notFound();
  }

  const assignedAdvisor =
    advisors.find((a) => a.id === participantRes.data.advisor_id) ?? null;

  const tradingStarts = tradingStartsRes.data ?? [];
  const currentTradingStart = tradingStarts[0] ?? null;

  const [iwtReviewsRes, outcomeRes] = currentTradingStart
    ? await Promise.all([
        supabase
          .from("iwt_reviews")
          .select("*")
          .eq("trading_start_id", currentTradingStart.id)
          .order("review_date", { ascending: false }),
        supabase
          .from("outcome_records")
          .select("*")
          .eq("trading_start_id", currentTradingStart.id)
          .maybeSingle(),
      ])
    : [{ data: [] }, { data: null }];

  return {
    participant: participantRes.data,
    assignedAdvisor,
    advisors,
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
    statusHistory: statusHistoryRes.data ?? [],
    tradingStarts,
    currentTradingStart,
    iwtReviews: iwtReviewsRes.data ?? [],
    outcome: outcomeRes.data,
    programmeSettings,
  };
}
