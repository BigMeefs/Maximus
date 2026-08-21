"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/data/notifications";
import type { GatewayBookedStatus, GatewayOutcome, GatewayReadiness } from "@/types/database";

export type ReadinessChecklistField = Extract<
  keyof GatewayReadiness,
  "trading_consistently" | "hours_worked_adequate" | "invoices_available" | "customer_base_established" | "business_sustainable" | "expected_to_make_profit"
>;

// Individually-tickable checklist items on the Gateway Readiness checklist —
// upserts the one field that changed, same auto-save-per-click pattern the
// checklist has always used.
export async function toggleReadinessItem(
  participantId: string,
  field: ReadinessChecklistField,
  isComplete: boolean,
) {
  const supabase = await createClient();
  const update: Partial<GatewayReadiness> & { participant_id: string } = { participant_id: participantId };
  update[field] = isComplete;
  await supabase.from("gateway_readiness").upsert(update, { onConflict: "participant_id" });

  revalidatePath("/advisors/[advisorId]", "layout");
}

export async function updateGatewayNotes(participantId: string, formData: FormData) {
  const notes = formData.get("gateway_notes")?.toString().trim() || null;
  const supabase = await createClient();
  await supabase.from("participants").update({ gateway_notes: notes }).eq("id", participantId);

  revalidatePath("/advisors/[advisorId]", "layout");
}

// ---------------------------------------------------------------------------
// Gateway booking + outcome — tracked directly on the participant, same as
// gateway_target_date / gateway_notes above. The outcome dropdown only
// applies once the Gateway is marked Completed, and is the Universal
// Credit decision, not an advisor recommendation. It feeds straight into
// the existing Trading Start eligibility engine: selecting GSE here has
// the same effect as the Trading Start tab's "Mark as GSE" action (the
// Trading Start itself is still only ever created manually by the
// advisor); selecting NGSE clears that flag so the standard
// two-month average rule applies instead.
// ---------------------------------------------------------------------------
export async function updateGatewayBooking(
  participantId: string,
  advisorId: string,
  formData: FormData,
) {
  const bookedStatus = (formData.get("gateway_booked_status")?.toString() as GatewayBookedStatus) || "Not Booked";
  const appointmentDate = formData.get("gateway_appointment_date")?.toString() || null;
  const outcomeRaw = formData.get("gateway_outcome")?.toString();
  const outcome: GatewayOutcome | null = outcomeRaw === "GSE" || outcomeRaw === "NGSE" ? outcomeRaw : null;

  const supabase = await createClient();

  await supabase
    .from("participants")
    .update({
      gateway_booked_status: bookedStatus,
      gateway_appointment_date: bookedStatus === "Not Booked" ? null : appointmentDate,
      gateway_outcome: bookedStatus === "Completed" ? outcome : null,
    })
    .eq("id", participantId);

  if (bookedStatus === "Completed" && outcome) {
    const { data: participant } = await supabase
      .from("participants")
      .select("ptp_name, status, advisor_id")
      .eq("id", participantId)
      .maybeSingle();
    const { data: advisor } = await supabase.from("advisors").select("full_name").eq("id", advisorId).maybeSingle();
    const advisorName = advisor?.full_name ?? "Unknown advisor";

    if (outcome === "GSE") {
      await supabase
        .from("participants")
        .update({ is_gse: true, gse_marked_at: new Date().toISOString(), gse_marked_by: advisorName })
        .eq("id", participantId);

      // Surface it as a work-queue notification immediately, using the same
      // dedupe key the lazy eligibility sync would use (notification-rules.ts)
      // so the two never produce duplicates, and so creating the Trading
      // Start later resolves this one too (resolveNotificationsForParticipant
      // in actions/trading-start.ts). The Trading Start is never created
      // automatically — an advisor still has to confirm and create it.
      if (participant && participant.status === "Active") {
        await createNotification({
          type: "trading_start_eligible_gse",
          status: "Action Required",
          title: `${participant.ptp_name} is eligible for a GSE Trading Start`,
          body: `Participant eligible for GSE Trading Start. Review and process the Trading Start.`,
          participantId,
          advisorId: participant.advisor_id,
          dedupeKey: `trading_start_eligible_gse:${participantId}`,
        });
      }
    } else {
      await supabase.from("participants").update({ is_gse: false }).eq("id", participantId);
    }
  }

  revalidatePath("/advisors/[advisorId]", "layout");
}
