"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionStatus } from "@/types/database";

export type ActionPlanFormState = {
  error?: string;
};

function revalidateParticipant(participantId: string) {
  revalidatePath(`/participants/${participantId}`);
  revalidatePath("/dashboard");
}

export async function createActionPlanItem(
  participantId: string,
  _prevState: ActionPlanFormState,
  formData: FormData,
): Promise<ActionPlanFormState> {
  const description = formData.get("description")?.toString().trim() ?? "";
  const targetDate = formData.get("target_date")?.toString() || null;
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!description) {
    return { error: "Describe the action to add." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("action_plan_items").insert({
    participant_id: participantId,
    description,
    target_date: targetDate,
    notes,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant(participantId);
  return {};
}

export async function updateActionPlanStatus(
  participantId: string,
  itemId: string,
  status: ActionStatus,
) {
  const supabase = await createClient();

  await supabase
    .from("action_plan_items")
    .update({
      status,
      completed_at: status === "Complete" ? new Date().toISOString() : null,
    })
    .eq("id", itemId);

  revalidateParticipant(participantId);
}

export async function deleteActionPlanItem(
  participantId: string,
  itemId: string,
) {
  const supabase = await createClient();
  await supabase.from("action_plan_items").delete().eq("id", itemId);
  revalidateParticipant(participantId);
}
