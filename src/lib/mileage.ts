// Tiered mileage allowance, mirroring HMRC's simplified mileage rates: 45p
// per mile up to the threshold, 25p per mile beyond it. The 833-mile
// threshold here is a per-submission (monthly) figure, not HMRC's real
// 10,000-mile annual threshold — this matches the CRM's month-by-month
// Income Tracker model rather than tracking a rolling annual total.
const FIRST_TIER_MILES = 833;
const FIRST_TIER_RATE = 0.45;
const SECOND_TIER_RATE = 0.25;

export function calculateMileageCost(miles: number): number {
  const m = Math.max(0, Number(miles) || 0);
  const cost =
    m <= FIRST_TIER_MILES
      ? m * FIRST_TIER_RATE
      : FIRST_TIER_MILES * FIRST_TIER_RATE + (m - FIRST_TIER_MILES) * SECOND_TIER_RATE;
  return Math.round(cost * 100) / 100;
}
