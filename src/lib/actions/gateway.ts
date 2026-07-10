"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GatewayChecklistItemName } from "@/types/database";

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
