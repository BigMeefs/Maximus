"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DigitalPlatform } from "@/types/database";

export async function updateDigitalPresenceItem(
  participantId: string,
  platform: DigitalPlatform,
  formData: FormData,
) {
  const isActive = formData.get("is_active") === "on";
  const url = formData.get("url")?.toString().trim() || null;
  const notes = formData.get("notes")?.toString().trim() || null;

  const supabase = await createClient();
  await supabase.from("digital_presence_items").upsert(
    { participant_id: participantId, platform, is_active: isActive, url, notes },
    { onConflict: "participant_id,platform" },
  );

  revalidatePath("/advisors/[advisorId]", "layout");
}
