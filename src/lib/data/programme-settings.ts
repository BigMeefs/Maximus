import { createClient } from "@/lib/supabase/server";
import type { ProgrammeSettings } from "@/types/database";

const DEFAULTS: Omit<ProgrammeSettings, "id" | "updated_at" | "updated_by"> = {
  ngse_average_threshold: 900,
  outcome_target: 5300,
  outcome_period_months: 6,
  gse_outcome_period_months: 6,
};

// Falls back to the documented defaults if the singleton row is somehow
// missing, so the rest of the app never has to null-check every field.
export async function getProgrammeSettings(): Promise<ProgrammeSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programme_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? { id: "", updated_at: "", updated_by: null, ...DEFAULTS };
}
