import { createClient } from "@/lib/supabase/server";
import type { OrganisationSettings } from "@/types/database";

// Matches the app's existing default branding exactly, so an unconfigured
// deployment (or a missing singleton row) looks identical to how this app
// always looked — nothing changes until an admin edits it.
const DEFAULTS: Omit<OrganisationSettings, "id" | "updated_at" | "updated_by"> = {
  org_name: "Maximus UK",
  app_name: "Max Self Employment Hub",
  logo_path: null,
  logo_name: null,
  primary_color: "#4f46e5",
  secondary_color: "#0f172a",
};

export async function getOrganisationSettings(): Promise<OrganisationSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisation_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? { id: "", updated_at: "", updated_by: null, ...DEFAULTS };
}

export async function getOrganisationLogoUrl(): Promise<string | null> {
  const settings = await getOrganisationSettings();
  if (!settings.logo_path) return null;

  const supabase = await createClient();
  const { data } = supabase.storage.from("organisation-branding").getPublicUrl(settings.logo_path);
  return data.publicUrl;
}
