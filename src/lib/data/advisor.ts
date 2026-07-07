import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Advisor, Office } from "@/types/database";

export type AdvisorWithOffice = Advisor & { office_name: string };

export async function getAdvisorOrNotFound(advisorId: string): Promise<AdvisorWithOffice> {
  const supabase = await createClient();

  const { data: advisor } = await supabase
    .from("advisors")
    .select("*")
    .eq("id", advisorId)
    .maybeSingle();

  if (!advisor) {
    notFound();
  }

  const { data: office } = await supabase
    .from("offices")
    .select("name")
    .eq("id", advisor.office_id)
    .maybeSingle();

  return { ...advisor, office_name: office?.name ?? "Unknown Office" };
}

export async function listAdvisors(opts?: { activeOnly?: boolean }): Promise<AdvisorWithOffice[]> {
  const supabase = await createClient();

  let query = supabase.from("advisors").select("*").order("full_name", { ascending: true });
  if (opts?.activeOnly) {
    query = query.eq("status", "Active");
  }

  const [{ data: advisors }, { data: offices }] = await Promise.all([
    query,
    supabase.from("offices").select("*"),
  ]);

  const officeNameById = new Map((offices ?? []).map((o) => [o.id, o.name]));

  return (advisors ?? []).map((a) => ({
    ...a,
    office_name: officeNameById.get(a.office_id) ?? "Unknown Office",
  }));
}

export async function listOffices(opts?: { activeOnly?: boolean }): Promise<Office[]> {
  const supabase = await createClient();
  let query = supabase.from("offices").select("*").order("name", { ascending: true });
  if (opts?.activeOnly) {
    query = query.eq("is_active", true);
  }
  const { data } = await query;
  return data ?? [];
}

export async function getAdvisorCaseloadCounts(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("participants").select("advisor_id");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.advisor_id, (counts.get(row.advisor_id) ?? 0) + 1);
  }
  return counts;
}
