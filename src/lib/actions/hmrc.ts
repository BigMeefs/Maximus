"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BusinessStructure } from "@/types/database";

export type HmrcFormState = {
  error?: string;
};

export async function updateHmrcInfo(
  participantId: string,
  _prevState: HmrcFormState,
  formData: FormData,
): Promise<HmrcFormState> {
  const businessStructure =
    (formData.get("business_structure")?.toString() as BusinessStructure) || null;
  const utrNumber = formData.get("utr_number")?.toString().trim() || null;
  const vatRegistered = formData.get("vat_registered") === "on";
  const payeRegistered = formData.get("paye_registered") === "on";
  const businessBankAccount = formData.get("business_bank_account") === "on";
  const insuranceInPlace = formData.get("insurance_in_place") === "on";
  const notes = formData.get("notes")?.toString().trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("hmrc_business_info").upsert(
    {
      participant_id: participantId,
      business_structure: businessStructure,
      utr_number: utrNumber,
      vat_registered: vatRegistered,
      paye_registered: payeRegistered,
      business_bank_account: businessBankAccount,
      insurance_in_place: insuranceInPlace,
      notes,
    },
    { onConflict: "participant_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/advisors/[advisorId]", "layout");
  return {};
}
