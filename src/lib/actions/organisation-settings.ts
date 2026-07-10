"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OrganisationSettingsFormState = {
  error?: string;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function revalidateAll() {
  revalidatePath("/admin/organisation-settings");
  revalidatePath("/", "layout");
}

async function getSingletonId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisation_settings")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function updateOrganisationSettings(
  _prevState: OrganisationSettingsFormState,
  formData: FormData,
): Promise<OrganisationSettingsFormState> {
  const orgName = formData.get("org_name")?.toString().trim() ?? "";
  const appName = formData.get("app_name")?.toString().trim() ?? "";
  const primaryColor = formData.get("primary_color")?.toString().trim() ?? "";
  const secondaryColor = formData.get("secondary_color")?.toString().trim() ?? "";

  if (!orgName || !appName) {
    return { error: "Organisation Name and Application Name are both required." };
  }
  if (!HEX_COLOR.test(primaryColor) || !HEX_COLOR.test(secondaryColor)) {
    return { error: "Colours must be a valid hex value, e.g. #4f46e5." };
  }

  const supabase = await createClient();
  const existingId = await getSingletonId();

  const values = {
    org_name: orgName,
    app_name: appName,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    updated_by: "admin",
  };

  const { error } = existingId
    ? await supabase.from("organisation_settings").update(values).eq("id", existingId)
    : await supabase.from("organisation_settings").insert(values);

  if (error) {
    return { error: error.message };
  }

  revalidateAll();
  return {};
}

export async function uploadOrganisationLogo(formData: FormData) {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const supabase = await createClient();
  const path = `logo-${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("organisation-branding")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const existingId = await getSingletonId();
  const values = { logo_path: path, logo_name: file.name, updated_by: "admin" };

  if (existingId) {
    await supabase.from("organisation_settings").update(values).eq("id", existingId);
  } else {
    await supabase.from("organisation_settings").insert(values);
  }

  revalidateAll();
}

export async function removeOrganisationLogo() {
  const existingId = await getSingletonId();
  if (!existingId) return;

  const supabase = await createClient();
  await supabase
    .from("organisation_settings")
    .update({ logo_path: null, logo_name: null, updated_by: "admin" })
    .eq("id", existingId);

  revalidateAll();
}
