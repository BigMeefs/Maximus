"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveNotificationsForParticipant } from "@/lib/data/notifications";

export type AppointmentFormState = {
  error?: string;
};

function revalidateParticipant() {
  // Advisor isn't known here, so revalidate the whole workspace layout
  // (dashboard, participants list, and every participant profile page).
  revalidatePath("/advisors/[advisorId]", "layout");
}

export async function createAppointment(
  participantId: string,
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const appointmentDate = formData.get("appointment_date")?.toString() ?? "";
  const advisorId = formData.get("advisor_id")?.toString().trim() ?? "";
  const notes = formData.get("notes")?.toString().trim() || null;
  const outcome = formData.get("outcome")?.toString().trim() || null;

  if (!appointmentDate || !advisorId) {
    return { error: "Date and advisor are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    participant_id: participantId,
    appointment_date: appointmentDate,
    advisor_id: advisorId,
    notes,
    outcome,
  });

  if (error) {
    return { error: error.message };
  }

  // Logging any appointment (past or future) counts as contact having been
  // made — clear any "requires contact" notification for this participant.
  // The next lazy sync will re-raise it once the configured contact period
  // has elapsed again.
  await resolveNotificationsForParticipant(participantId, ["contact_required"], "System (appointment logged)");

  revalidateParticipant();
  return {};
}

export async function deleteAppointment(
  participantId: string,
  appointmentId: string,
) {
  const supabase = await createClient();
  await supabase.from("appointments").delete().eq("id", appointmentId);
  revalidateParticipant();
}
