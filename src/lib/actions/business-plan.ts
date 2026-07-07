"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BusinessPlanStatus } from "@/types/database";

function revalidateParticipant() {
  // Advisor isn't known here, so revalidate the whole workspace layout
  // (dashboard, participants list, and every participant profile page).
  revalidatePath("/advisors/[advisor]", "layout");
}

export async function updateBusinessPlanStatus(
  participantId: string,
  status: BusinessPlanStatus,
) {
  const supabase = await createClient();

  await supabase
    .from("business_plans")
    .upsert(
      { participant_id: participantId, status },
      { onConflict: "participant_id" },
    );

  revalidateParticipant();
}

export async function uploadBusinessPlanFile(
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
    .from("business-plans")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  await supabase.from("business_plans").upsert(
    {
      participant_id: participantId,
      file_path: path,
      file_name: file.name,
    },
    { onConflict: "participant_id" },
  );

  revalidateParticipant();
}

export async function deleteBusinessPlanFile(
  participantId: string,
  filePath: string,
) {
  const supabase = await createClient();

  await supabase.storage.from("business-plans").remove([filePath]);

  await supabase
    .from("business_plans")
    .update({ file_path: null, file_name: null })
    .eq("participant_id", participantId);

  revalidateParticipant();
}

export async function getBusinessPlanFileUrl(filePath: string) {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("business-plans")
    .createSignedUrl(filePath, 60 * 60);

  return data?.signedUrl ?? null;
}
