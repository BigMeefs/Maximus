import { createClient } from "@/lib/supabase/server";
import type { MplTarget } from "@/types/database";

// Minimum Performance Level — see the mpl_targets migration comment for
// why this is a per-month history rather than a single current value.

export async function getAllMplTargets(): Promise<MplTarget[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mpl_targets").select("*").order("effective_month", { ascending: true });
  return data ?? [];
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// The MPL that applied to a given month: the most recent target row at or
// before that month. A month before any MPL was ever configured (or, more
// generally, any month with no applicable row) resolves to null — callers
// must treat that as "no target set," never as zero.
export function getMplForMonth(
  monthKey: string,
  targets: MplTarget[],
): { tradingStartsMpl: number; outcomesMpl: number } | null {
  let applicable: MplTarget | null = null;
  for (const t of targets) {
    const key = t.effective_month.slice(0, 7);
    if (key > monthKey) continue;
    if (!applicable || key > applicable.effective_month.slice(0, 7)) applicable = t;
  }
  return applicable ? { tradingStartsMpl: applicable.trading_starts_mpl, outcomesMpl: applicable.outcomes_mpl } : null;
}

export async function getCurrentMpl(): Promise<{ tradingStartsMpl: number; outcomesMpl: number } | null> {
  const targets = await getAllMplTargets();
  return getMplForMonth(monthKeyOf(new Date()), targets);
}
