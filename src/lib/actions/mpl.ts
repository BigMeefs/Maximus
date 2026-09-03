"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { monthKeyOf } from "@/lib/data/mpl";

export type MplFormState = {
  error?: string;
};

function toPositiveInt(formData: FormData, field: string): number | null {
  const raw = formData.get(field)?.toString().trim();
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

// Editing MPL always upserts the row for the CURRENT calendar month —
// never any earlier month's row, so past months keep whatever target
// applied to them at the time. See the mpl_targets migration comment.
export async function updateMplTargets(_prevState: MplFormState, formData: FormData): Promise<MplFormState> {
  const tradingStartsMpl = toPositiveInt(formData, "trading_starts_mpl");
  const outcomesMpl = toPositiveInt(formData, "outcomes_mpl");

  if (!tradingStartsMpl || !outcomesMpl) {
    return { error: "Both targets are required and must be positive whole numbers." };
  }

  const supabase = await createClient();
  const effectiveMonth = `${monthKeyOf(new Date())}-01`;

  const { error } = await supabase.from("mpl_targets").upsert(
    {
      effective_month: effectiveMonth,
      trading_starts_mpl: tradingStartsMpl,
      outcomes_mpl: outcomesMpl,
      updated_by: "admin",
    },
    { onConflict: "effective_month" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/performance");
  return {};
}
