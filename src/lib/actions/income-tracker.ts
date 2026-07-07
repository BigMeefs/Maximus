"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type IncomeTrackerFormState = {
  error?: string;
};

function revalidateParticipant() {
  revalidatePath("/advisors/[advisor]", "layout");
}

function numberOrZero(value: FormDataEntryValue | null) {
  const num = Number(value?.toString().trim() || 0);
  return Number.isNaN(num) ? 0 : num;
}

export async function upsertIncomeTrackerEntry(
  participantId: string,
  _prevState: IncomeTrackerFormState,
  formData: FormData,
): Promise<IncomeTrackerFormState> {
  const entryDate = formData.get("entry_date")?.toString() ?? "";
  const income = numberOrZero(formData.get("income"));
  const expense = numberOrZero(formData.get("expense"));
  const mileageCost = numberOrZero(formData.get("mileage_cost"));
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!entryDate) {
    return { error: "Select a date." };
  }

  const month = `${entryDate.slice(0, 7)}-01`;
  const supabase = await createClient();

  const { error } = await supabase.from("income_tracker_entries").upsert(
    {
      participant_id: participantId,
      month,
      entry_date: entryDate,
      income,
      expense,
      mileage_cost: mileageCost,
      notes,
      source: "manual",
    },
    { onConflict: "participant_id,month" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant();
  return {};
}

export async function deleteIncomeTrackerEntry(entryId: string) {
  const supabase = await createClient();
  await supabase.from("income_tracker_entries").delete().eq("id", entryId);
  revalidateParticipant();
}
