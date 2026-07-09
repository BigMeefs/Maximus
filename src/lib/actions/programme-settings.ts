"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProgrammeSettingsFormState = {
  error?: string;
};

function toPositiveNumber(formData: FormData, field: string): number | null {
  const raw = formData.get(field)?.toString().trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function toPositiveInt(formData: FormData, field: string): number | null {
  const raw = formData.get(field)?.toString().trim();
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function updateProgrammeSettings(
  _prevState: ProgrammeSettingsFormState,
  formData: FormData,
): Promise<ProgrammeSettingsFormState> {
  const ngseAverageThreshold = toPositiveNumber(formData, "ngse_average_threshold");
  const outcomeTarget = toPositiveNumber(formData, "outcome_target");
  const outcomePeriodMonths = toPositiveInt(formData, "outcome_period_months");
  const gseOutcomePeriodMonths = toPositiveInt(formData, "gse_outcome_period_months");

  if (!ngseAverageThreshold || !outcomeTarget || !outcomePeriodMonths || !gseOutcomePeriodMonths) {
    return { error: "All four settings are required and must be positive numbers." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("programme_settings")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const values = {
    ngse_average_threshold: ngseAverageThreshold,
    outcome_target: outcomeTarget,
    outcome_period_months: outcomePeriodMonths,
    gse_outcome_period_months: gseOutcomePeriodMonths,
    updated_by: "admin",
  };

  const { error } = existing
    ? await supabase.from("programme_settings").update(values).eq("id", existing.id)
    : await supabase.from("programme_settings").insert(values);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/programme-settings");
  revalidatePath("/advisors/[advisorId]", "layout");
  revalidatePath("/reports");
  return {};
}
