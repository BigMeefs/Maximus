"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AppointmentFormState = {
  error?: string;
};

function revalidateParticipant(participantId: string) {
  revalidatePath(`/participants/${participantId}`);
}

export async function createAppointment(
  participantId: string,
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const appointmentDate = formData.get("appointment_date")?.toString() ?? "";
  const advisorName = formData.get("advisor_name")?.toString().trim() ?? "";
  const notes = formData.get("notes")?.toString().trim() || null;
  const outcome = formData.get("outcome")?.toString().trim() || null;

  if (!appointmentDate || !advisorName) {
    return { error: "Date and advisor are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    participant_id: participantId,
    appointment_date: appointmentDate,
    advisor_name: advisorName,
    notes,
    outcome,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateParticipant(participantId);
  return {};
}

export async function deleteAppointment(
  participantId: string,
  appointmentId: string,
) {
  const supabase = await createClient();
  await supabase.from("appointments").delete().eq("id", appointmentId);
  revalidateParticipant(participantId);
}
