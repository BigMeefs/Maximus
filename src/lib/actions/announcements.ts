"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementFormState = {
  error?: string;
};

function revalidateAll() {
  revalidatePath("/admin/announcements");
  revalidatePath("/advisors/[advisorId]", "layout");
}

export async function createAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const title = formData.get("title")?.toString().trim() ?? "";
  const body = formData.get("body")?.toString().trim() ?? "";

  if (!title || !body) {
    return { error: "Title and message are both required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    created_by: "admin",
  });

  if (error) {
    return { error: error.message };
  }

  revalidateAll();
  return {};
}

export async function toggleAnnouncementActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("announcements").update({ is_active: isActive }).eq("id", id);
  revalidateAll();
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidateAll();
}
