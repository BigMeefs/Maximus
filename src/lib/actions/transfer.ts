"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ParticipantTransfer } from "@/types/database";

export type TransferFormState = {
  error?: string;
  success?: string;
};

export async function transferParticipants(
  _prevState: TransferFormState,
  formData: FormData,
): Promise<TransferFormState> {
  const participantIds = formData.getAll("participant_ids").map((v) => v.toString());
  const toAdvisorId = formData.get("to_advisor_id")?.toString() ?? "";
  const notes = formData.get("notes")?.toString().trim() || null;

  if (participantIds.length === 0) {
    return { error: "Select at least one participant to transfer." };
  }
  if (!toAdvisorId) {
    return { error: "Choose a destination advisor." };
  }

  const supabase = await createClient();

  const { data: toAdvisor } = await supabase
    .from("advisors")
    .select("id, office_id")
    .eq("id", toAdvisorId)
    .maybeSingle();

  if (!toAdvisor) {
    return { error: "Destination advisor not found." };
  }

  const { data: participants } = await supabase
    .from("participants")
    .select("id, advisor_id")
    .in("id", participantIds);

  if (!participants || participants.length === 0) {
    return { error: "Selected participants were not found." };
  }

  const fromAdvisorIds = [...new Set(participants.map((p) => p.advisor_id))];
  const { data: fromAdvisors } = await supabase
    .from("advisors")
    .select("id, office_id")
    .in("id", fromAdvisorIds);

  const fromOfficeByAdvisor = new Map((fromAdvisors ?? []).map((a) => [a.id, a.office_id]));
  const actualTransfers = participants.filter((p) => p.advisor_id !== toAdvisorId);

  if (actualTransfers.length === 0) {
    return { error: "All selected participants are already assigned to that advisor." };
  }

  const { error: updateError } = await supabase
    .from("participants")
    .update({ advisor_id: toAdvisorId })
    .in("id", actualTransfers.map((p) => p.id));

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase.from("participant_transfers").insert(
    actualTransfers.map((p) => ({
      participant_id: p.id,
      from_advisor_id: p.advisor_id,
      to_advisor_id: toAdvisorId,
      from_office_id: fromOfficeByAdvisor.get(p.advisor_id) ?? null,
      to_office_id: toAdvisor.office_id,
      transferred_by: "Admin",
      notes,
    })),
  );

  revalidatePath("/admin", "layout");
  revalidatePath("/advisors/[advisorId]", "layout");

  return {
    success: `Transferred ${actualTransfers.length} participant${actualTransfers.length === 1 ? "" : "s"} to their new advisor.`,
  };
}

export async function getRecentTransfers(limit = 20): Promise<ParticipantTransfer[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("participant_transfers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
