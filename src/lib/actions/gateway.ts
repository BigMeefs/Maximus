"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GatewayBookedStatus, GatewayChecklistItemName, GatewayOutcome } from "@/types/database";

export async function toggleGatewayChecklistItem(
  participantId: string,
  item: GatewayChecklistItemName,
  isComplete: boolean,
) {
  const supabase = await createClient();
  await supabase.from("gateway_checklist_items").upsert(
    { participant_id: participantId, item, is_complete: isComplete },
    { onConflict: "participant_id,item" },
  );

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
// applies once the Gateway is marked Completed, and feeds straight into the
// existing Trading Start eligibility engine: selecting GSE here has the
// same effect as the Trading Start tab's "Mark as GSE" action; selecting
// NGSE clears that flag so the standard two-month-average rule applies.
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
    const { data: advisor } = await supabase.from("advisors").select("full_name").eq("id", advisorId).maybeSingle();
    const advisorName = advisor?.full_name ?? "Unknown advisor";

    if (outcome === "GSE") {
      await supabase
        .from("participants")
        .update({ is_gse: true, gse_marked_at: new Date().toISOString(), gse_marked_by: advisorName })
        .eq("id", participantId);
    } else {
      await supabase.from("participants").update({ is_gse: false }).eq("id", participantId);
    }
  }

  revalidatePath("/advisors/[advisorId]", "layout");
}
