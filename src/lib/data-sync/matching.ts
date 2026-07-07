import type { Participant } from "@/types/database";
import type { MappedParticipantRow, MatchOutcome } from "./types";

export type MatchCandidate = Pick<
  Participant,
  "id" | "external_participant_id" | "email" | "phone" | "national_insurance_number" | "ptp_name" | "date_of_birth"
>;

function norm(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

// Finds the existing participant a row should update, in priority order:
// external ID (strongest) -> email -> phone -> NI number -> name+DOB
// (weakest, used only when nothing stronger is available). Falls back to
// "create" when no candidate matches on any supplied key.
export function findMatch(row: MappedParticipantRow, candidates: MatchCandidate[]): MatchOutcome {
  const v = row.values;

  if (v.external_participant_id) {
    const hit = candidates.find((c) => norm(c.external_participant_id) === norm(v.external_participant_id));
    if (hit) return { type: "match", participantId: hit.id, matchedOn: "external_participant_id" };
  }

  if (v.email) {
    const hit = candidates.find((c) => norm(c.email) === norm(v.email));
    if (hit) return { type: "match", participantId: hit.id, matchedOn: "email" };
  }

  if (v.phone) {
    const hit = candidates.find((c) => norm(c.phone) === norm(v.phone));
    if (hit) return { type: "match", participantId: hit.id, matchedOn: "phone" };
  }

  if (v.national_insurance_number) {
    const hit = candidates.find(
      (c) => norm(c.national_insurance_number) === norm(v.national_insurance_number),
    );
    if (hit) return { type: "match", participantId: hit.id, matchedOn: "national_insurance_number" };
  }

  if (v.ptp_name && v.date_of_birth) {
    const hit = candidates.find(
      (c) => norm(c.ptp_name) === norm(v.ptp_name) && c.date_of_birth === v.date_of_birth,
    );
    if (hit) return { type: "match", participantId: hit.id, matchedOn: "name_dob" };
  }

  return { type: "create" };
}
