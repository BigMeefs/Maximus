import { differenceInCalendarDays } from "date-fns";
import { SCHEME_DURATION_DAYS } from "@/lib/constants";

export function getDaysRemaining(schemeStartDate: string, today = new Date()) {
  const start = new Date(schemeStartDate);
  const elapsed = differenceInCalendarDays(today, start);
  return SCHEME_DURATION_DAYS - elapsed;
}

export function isExpiringSoon(schemeStartDate: string, threshold = 30) {
  const daysRemaining = getDaysRemaining(schemeStartDate);
  return daysRemaining <= threshold;
}
