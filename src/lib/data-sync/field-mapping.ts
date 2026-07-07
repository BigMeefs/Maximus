import type { FieldMapping, ParticipantTargetField } from "./types";

export type FieldDefinition = {
  field: ParticipantTargetField;
  label: string;
  required: boolean;
  description: string;
  aliases: string[];
};

export const IMPORTABLE_FIELDS: FieldDefinition[] = [
  {
    field: "external_participant_id",
    label: "Participant ID",
    required: false,
    description: "Unique ID from the source system — the strongest match key.",
    aliases: ["participant id", "participantid", "id", "iconi id", "client id", "reference", "ref"],
  },
  {
    field: "ptp_name",
    label: "Name",
    required: true,
    description: "Participant's full name.",
    aliases: ["name", "participant name", "ptp name", "full name", "client name"],
  },
  {
    field: "business_name",
    label: "Business Name",
    required: true,
    description: "Name of the participant's business.",
    aliases: ["business name", "business", "company", "company name", "trading name"],
  },
  {
    field: "advisor_name",
    label: "Assigned Advisor",
    required: false,
    description: "Advisor's full name as it appears in the Administration panel — auto-assigned if recognised.",
    aliases: ["advisor", "advisor name", "assigned advisor", "caseworker", "coach"],
  },
  {
    field: "email",
    label: "Email",
    required: false,
    description: "Used as a matching key and contact detail.",
    aliases: ["email", "email address", "e-mail"],
  },
  {
    field: "phone",
    label: "Phone",
    required: false,
    description: "Used as a matching key and contact detail.",
    aliases: ["phone", "phone number", "telephone", "mobile", "contact number"],
  },
  {
    field: "date_of_birth",
    label: "Date of Birth",
    required: false,
    description: "Used with Name as a fallback matching key.",
    aliases: ["date of birth", "dob", "birth date"],
  },
  {
    field: "national_insurance_number",
    label: "National Insurance Number",
    required: false,
    description: "Sensitive UK identifier — only import if permitted.",
    aliases: ["national insurance number", "ni number", "nino", "national insurance"],
  },
  {
    field: "business_sector",
    label: "Business Sector",
    required: false,
    description: "Industry / sector of the business.",
    aliases: ["business sector", "sector", "industry"],
  },
  {
    field: "scheme_start_date",
    label: "Scheme Start Date",
    required: true,
    description: "Date the participant started on the Restart scheme.",
    aliases: ["scheme start date", "start date", "referral date", "programme start date"],
  },
  {
    field: "gateway_target_date",
    label: "Gateway Target Date",
    required: false,
    description: "Target date for the Gateway decision.",
    aliases: ["gateway target date", "gateway date", "gateway target"],
  },
  {
    field: "website",
    label: "Website",
    required: false,
    description: "Business website URL.",
    aliases: ["website", "web site", "url"],
  },
  {
    field: "social_media_links",
    label: "Social Media Links",
    required: false,
    description: "Social media handles or links.",
    aliases: ["social media", "social media links", "social links"],
  },
  {
    field: "previous_advisor",
    label: "Previous Advisor",
    required: false,
    description: "Advisor who previously owned this participant, if any.",
    aliases: ["previous advisor", "prior advisor", "former advisor"],
  },
];

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

// Best-effort header -> target field suggestion, used to pre-fill the mapping
// screen. Advisors can always override before confirming an import.
export function suggestFieldMapping(sourceColumns: string[]): FieldMapping {
  const mapping: FieldMapping = {};
  const usedColumns = new Set<string>();

  for (const def of IMPORTABLE_FIELDS) {
    const match = sourceColumns.find((col) => {
      if (usedColumns.has(col)) return false;
      const normalized = normalizeHeader(col);
      return normalized === def.field.replace(/_/g, " ") || def.aliases.includes(normalized);
    });
    if (match) {
      mapping[def.field] = match;
      usedColumns.add(match);
    }
  }

  return mapping;
}
