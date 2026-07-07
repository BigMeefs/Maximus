"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdvisorStatus } from "@/types/database";

export type AdminFormState = {
  error?: string;
};

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/select-advisor");
}

// ---------------------------------------------------------------------------
// Offices
// ---------------------------------------------------------------------------

export async function createOffice(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) {
    return { error: "Office name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("offices").insert({ name });

  if (error) {
    return { error: error.message.includes("duplicate") ? "An office with that name already exists." : error.message };
  }

  revalidateAdmin();
  return {};
}

export async function renameOffice(
  officeId: string,
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  if (!name) {
    return { error: "Office name is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("offices").update({ name }).eq("id", officeId);

  if (error) {
    return { error: error.message.includes("duplicate") ? "An office with that name already exists." : error.message };
  }

  revalidateAdmin();
  return {};
}

export async function setOfficeActive(officeId: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("offices").update({ is_active: isActive }).eq("id", officeId);
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Advisors
// ---------------------------------------------------------------------------

function readAdvisorFields(formData: FormData) {
  return {
    fullName: formData.get("full_name")?.toString().trim() ?? "",
    email: formData.get("email")?.toString().trim() ?? "",
    officeId: formData.get("office_id")?.toString() ?? "",
    jobTitle: formData.get("job_title")?.toString().trim() || null,
  };
}

export async function createAdvisor(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const fields = readAdvisorFields(formData);

  if (!fields.fullName || !fields.email || !fields.officeId) {
    return { error: "Full name, email and office are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("advisors").insert({
    full_name: fields.fullName,
    email: fields.email,
    office_id: fields.officeId,
    job_title: fields.jobTitle,
  });

  if (error) {
    return { error: error.message.includes("duplicate") ? "An advisor with that email already exists." : error.message };
  }

  revalidateAdmin();
  return {};
}

export async function updateAdvisor(
  advisorId: string,
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const fields = readAdvisorFields(formData);

  if (!fields.fullName || !fields.email || !fields.officeId) {
    return { error: "Full name, email and office are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("advisors")
    .update({
      full_name: fields.fullName,
      email: fields.email,
      office_id: fields.officeId,
      job_title: fields.jobTitle,
    })
    .eq("id", advisorId);

  if (error) {
    return { error: error.message.includes("duplicate") ? "An advisor with that email already exists." : error.message };
  }

  revalidateAdmin();
  return {};
}

export async function setAdvisorStatus(advisorId: string, status: AdvisorStatus) {
  const supabase = await createClient();
  await supabase.from("advisors").update({ status }).eq("id", advisorId);
  revalidateAdmin();
}
