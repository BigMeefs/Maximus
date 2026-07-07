"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EarningsFormState = {
  error?: string;
};

function revalidateParticipant() {
  // Advisor isn't known here, so revalidate the whole workspace layout
  // (dashboard, participants list, and every participant profile page).
  revalidatePath("/advisors/[advisor]", "layout");
}

function numberOrNull(value: FormDataEntryValue | null) {
  const str = value?.toString().trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isNaN(num) ? null : num;
}

export async function upsertMonthlyEarning(
  participantId: string,
  _prevState: EarningsFormState,
  formData: FormData,
): Promise<EarningsFormState> {
  const month = formData.get("month")?.toString() ?? "";
  const amountRaw = formData.get("amount")?.toString() ?? "";
  const amount = Number(amountRaw);
  const expenses = numberOrNull(formData.get("expenses")) ?? 0;
  const hoursWorked = numberOrNull(formData.get("hours_worked"));
  const customerCount = numberOrNull(formData.get("customer_count"));
  const largestCustomer = formData.get("largest_customer")?.toString().trim() || null;
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!month) {
    return { error: "Select a month." };
  }
  if (!amountRaw || Number.isNaN(amount) || amount < 0) {
    return { error: "Enter a valid income amount." };
  }

  const monthDate = `${month}-01`;
  const supabase = await createClient();

  const { error } = await supabase.from("monthly_earnings").upsert(
    {
      participant_id: participantId,
      month: monthDate,
      amount,
      expenses,
      hours_worked: hoursWorked,
      customer_count: customerCount,
      largest_customer: largestCustomer,
      notes,
    },
    { onConflict: "participant_id,month" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant();
  return {};
}

export async function deleteMonthlyEarning(
  participantId: string,
  earningId: string,
) {
  const supabase = await createClient();
  await supabase.from("monthly_earnings").delete().eq("id", earningId);
  revalidateParticipant();
}
