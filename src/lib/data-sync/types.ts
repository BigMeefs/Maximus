// Shared types for the Data Sync import engine. Deliberately decoupled from
// *how* rows arrive — an ImportRow today comes from a parsed spreadsheet, but
// a future Power BI connector can produce the same shape without touching
// the matching/validation/transform logic below.

export type ImportSourceType = "file" | "power-bi";

export type ParticipantTargetField =
  | "external_participant_id"
  | "ptp_name"
  | "business_name"
  | "advisor_name"
  | "email"
  | "phone"
  | "date_of_birth"
  | "national_insurance_number"
  | "business_sector"
  | "scheme_start_date"
  | "gateway_target_date"
  | "website"
  | "social_media_links"
  | "previous_advisor";

// target field -> source column name
export type FieldMapping = Partial<Record<ParticipantTargetField, string>>;

export type ImportRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
};

export type MappedParticipantRow = {
  rowNumber: number;
  values: Partial<Record<ParticipantTargetField, string | null>>;
};

export type ValidationIssue = {
  rowNumber: number;
  field?: ParticipantTargetField;
  severity: "error" | "warning";
  message: string;
};

export type MatchKey =
  | "external_participant_id"
  | "email"
  | "phone"
  | "national_insurance_number"
  | "name_dob";

export type MatchOutcome =
  | { type: "create" }
  | { type: "match"; participantId: string; matchedOn: MatchKey };
