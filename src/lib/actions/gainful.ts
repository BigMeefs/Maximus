"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GainfulRecommendation } from "@/types/database";

const CHECKBOX_FIELDS = [
  "trading_consistently",
  "hours_worked_adequate",
  "customer_base_established",
  "business_sustainable",
  "expected_to_make_profit",
  "manager_approval",
] as const;

export async function updateGainfulAssessment(
  participantId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const values: Record<string, boolean | string | null> = {};
  for (const field of CHECKBOX_FIELDS) {
    values[field] = formData.get(field) === "on";
  }

  values.advisor_recommendation =
    formData.get("advisor_recommendation")?.toString().trim() || null;
  values.manager_notes = formData.get("manager_notes")?.toString().trim() || null;
  values.overall_recommendation = formData.get(
    "overall_recommendation",
  ) as GainfulRecommendation;
  values.decision_date = formData.get("decision_date")?.toString() || null;

  await supabase.from("gainful_assessments").upsert(
    { participant_id: participantId, ...values },
    { onConflict: "participant_id" },
  );

  revalidatePath("/advisors/[advisorId]", "layout");
}
