"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function revalidateParticipant() {
  // Advisor isn't known here, so revalidate the whole workspace layout
  // (dashboard, participants list, and every participant profile page).
  revalidatePath("/advisors/[advisor]", "layout");
}

export async function uploadEvidenceFile(
  participantId: string,
  formData: FormData,
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const supabase = await createClient();

  const path = `${participantId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("evidence-files")
    .upload(path, file);

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  await supabase.from("evidence_files").insert({
    participant_id: participantId,
    file_path: path,
    file_name: file.name,
  });

  revalidateParticipant();
}

export async function deleteEvidenceFile(
  participantId: string,
  evidenceId: string,
  filePath: string,
) {
  const supabase = await createClient();

  await supabase.storage.from("evidence-files").remove([filePath]);
  await supabase.from("evidence_files").delete().eq("id", evidenceId);

  revalidateParticipant();
}

export async function getEvidenceFileUrl(filePath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("evidence-files")
    .createSignedUrl(filePath, 60 * 60);

  return data?.signedUrl ?? null;
}
