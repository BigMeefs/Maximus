"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EarningsFormState = {
  error?: string;
};

function revalidateParticipant(participantId: string) {
  revalidatePath(`/participants/${participantId}`);
  revalidatePath("/dashboard");
}

export async function upsertMonthlyEarning(
  participantId: string,
  _prevState: EarningsFormState,
  formData: FormData,
): Promise<EarningsFormState> {
  const month = formData.get("month")?.toString() ?? "";
  const amountRaw = formData.get("amount")?.toString() ?? "";
  const amount = Number(amountRaw);

  if (!month) {
    return { error: "Select a month." };
  }
  if (!amountRaw || Number.isNaN(amount) || amount < 0) {
    return { error: "Enter a valid earnings amount." };
  }

  const monthDate = `${month}-01`;
  const supabase = await createClient();

  const { error } = await supabase
    .from("monthly_earnings")
    .upsert(
      { participant_id: participantId, month: monthDate, amount },
      { onConflict: "participant_id,month" },
    );

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant(participantId);
  return {};
}

export async function deleteMonthlyEarning(
  participantId: string,
  earningId: string,
) {
  const supabase = await createClient();
  await supabase.from("monthly_earnings").delete().eq("id", earningId);
  revalidateParticipant(participantId);
}
