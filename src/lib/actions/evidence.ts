"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisor } from "@/lib/current-advisor";

function revalidateParticipant(participantId: string) {
  revalidatePath(`/participants/${participantId}`);
}

export async function uploadEvidenceFile(
  participantId: string,
  formData: FormData,
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const advisor = await getCurrentAdvisor();
  const supabase = await createClient();

  const path = `${advisor.id}/${participantId}/${Date.now()}-${file.name}`;

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

  revalidateParticipant(participantId);
}

export async function deleteEvidenceFile(
  participantId: string,
  evidenceId: string,
  filePath: string,
) {
  const supabase = await createClient();

  await supabase.storage.from("evidence-files").remove([filePath]);
  await supabase.from("evidence_files").delete().eq("id", evidenceId);

  revalidateParticipant(participantId);
}

export async function getEvidenceFileUrl(filePath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("evidence-files")
    .createSignedUrl(filePath, 60 * 60);

  return data?.signedUrl ?? null;
}
