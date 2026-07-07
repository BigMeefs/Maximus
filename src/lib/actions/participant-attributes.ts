"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BusinessStage, RagStatus } from "@/types/database";

function revalidateParticipant() {
  revalidatePath("/advisors/[advisor]", "layout");
}

export async function updateBusinessStage(
  participantId: string,
  stage: BusinessStage,
) {
  const supabase = await createClient();
  await supabase
    .from("participants")
    .update({ business_stage: stage })
    .eq("id", participantId);

  revalidateParticipant();
}

export async function updateRagStatus(participantId: string, formData: FormData) {
  const status = formData.get("rag_status")?.toString() as RagStatus;
  const note = formData.get("rag_note")?.toString().trim() || null;

  const supabase = await createClient();
  await supabase
    .from("participants")
    .update({ rag_status: status, rag_note: note })
    .eq("id", participantId);

  revalidateParticipant();
}

export async function updateHealthConfidence(
  participantId: string,
  value: number,
) {
  const supabase = await createClient();
  await supabase
    .from("participants")
    .update({ health_confidence: value })
    .eq("id", participantId);

  revalidateParticipant();
}
