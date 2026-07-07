export const ADVISOR_NAMES = ["Kyle", "Charles", "Elliott", "Aroosa"] as const;
export type AdvisorName = (typeof ADVISOR_NAMES)[number];

export function isAdvisorName(value: string | undefined): value is AdvisorName {
  return !!value && (ADVISOR_NAMES as readonly string[]).includes(value);
}

export const SCHEME_DURATION_DAYS = 365;
