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
  const hmrcRegistrationDate =
    formData.get("hmrc_registration_date")?.toString() || null;
  const vatRegistered = formData.get("vat_registered") === "on";
  const payeRegistered = formData.get("paye_registered") === "on";
  const businessBankAccount = formData.get("business_bank_account") === "on";
  const insuranceStatus = formData.get("insurance_status")?.toString().trim() || null;
  const accountantName = formData.get("accountant_name")?.toString().trim() || null;
  const accountantContact =
    formData.get("accountant_contact")?.toString().trim() || null;
  const taxDeadlineNotes =
    formData.get("tax_deadline_notes")?.toString().trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("hmrc_business_info").upsert(
    {
      participant_id: participantId,
      business_structure: businessStructure,
      utr_number: utrNumber,
      hmrc_registration_date: hmrcRegistrationDate,
      vat_registered: vatRegistered,
      paye_registered: payeRegistered,
      business_bank_account: businessBankAccount,
      insurance_status: insuranceStatus,
      accountant_name: accountantName,
      accountant_contact: accountantContact,
      tax_deadline_notes: taxDeadlineNotes,
    },
    { onConflict: "participant_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/advisors/[advisor]", "layout");
  return {};
}
