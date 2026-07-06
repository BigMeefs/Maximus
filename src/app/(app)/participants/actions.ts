"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdvisor } from "@/lib/current-advisor";

export type ParticipantFormState = {
  error?: string;
};

function readParticipantFields(formData: FormData) {
  const ptpName = formData.get("ptp_name")?.toString().trim() ?? "";
  const businessName = formData.get("business_name")?.toString().trim() ?? "";
  const previousAdvisor =
    formData.get("previous_advisor")?.toString().trim() || null;
  const schemeStartDate = formData.get("scheme_start_date")?.toString() ?? "";
  const website = formData.get("website")?.toString().trim() || null;
  const socialMediaLinks =
    formData.get("social_media_links")?.toString().trim() || null;

  return {
    ptpName,
    businessName,
    previousAdvisor,
    schemeStartDate,
    website,
    socialMediaLinks,
  };
}

export async function createParticipant(
  _prevState: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  const advisor = await getCurrentAdvisor();
  const fields = readParticipantFields(formData);

  if (!fields.ptpName || !fields.businessName || !fields.schemeStartDate) {
    return { error: "PTP name, business name and scheme start date are required." };
  }

  const supabase = await createClient();

  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      advisor_id: advisor.id,
      ptp_name: fields.ptpName,
      business_name: fields.businessName,
      previous_advisor: fields.previousAdvisor,
      scheme_start_date: fields.schemeStartDate,
      website: fields.website,
      social_media_links: fields.socialMediaLinks,
    })
    .select("id")
    .single();

  if (error || !participant) {
    return { error: error?.message ?? "Failed to create participant." };
  }

  await supabase
    .from("business_plans")
    .insert({ participant_id: participant.id, status: "Not Started" });

  revalidatePath("/participants");
  revalidatePath("/dashboard");
  redirect(`/participants/${participant.id}`);
}

export async function updateParticipant(
  participantId: string,
  _prevState: ParticipantFormState,
  formData: FormData,
): Promise<ParticipantFormState> {
  const fields = readParticipantFields(formData);

  if (!fields.ptpName || !fields.businessName || !fields.schemeStartDate) {
    return { error: "PTP name, business name and scheme start date are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("participants")
    .update({
      ptp_name: fields.ptpName,
      business_name: fields.businessName,
      previous_advisor: fields.previousAdvisor,
      scheme_start_date: fields.schemeStartDate,
      website: fields.website,
      social_media_links: fields.socialMediaLinks,
    })
    .eq("id", participantId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/participants");
  revalidatePath(`/participants/${participantId}`);
  revalidatePath("/dashboard");
  redirect(`/participants/${participantId}`);
}

export async function deleteParticipant(participantId: string) {
  const supabase = await createClient();
  await supabase.from("participants").delete().eq("id", participantId);

  revalidatePath("/participants");
  revalidatePath("/dashboard");
  redirect("/participants");
}
