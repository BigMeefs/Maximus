import type { IncomeTrackerEntry, IwtReview, ProgrammeSettings, TradingStart } from "@/types/database";
import {
  computeGseOutcomeProgress,
  computeMonetaryOutcomeProgress,
  isDeclarationMissing,
  isReviewOverdue,
} from "@/lib/trading-start-rules";

export type HealthTone = "green" | "amber" | "red";

export type ParticipantHealth = {
  tone: HealthTone;
  label: string;
  reasons: string[];
};

// Pace thresholds for NGSE / Claim Closed: how the participant's actual
// average monthly profit since Trading Start compares to the monthly pace
// still required to hit the configured Outcome target by the deadline.
const ON_TRACK_PACE_RATIO = 1;
const NEEDS_ATTENTION_PACE_RATIO = 0.7;

function monetaryHealth(
  tradingStart: TradingStart,
  entries: IncomeTrackerEntry[],
  settings: ProgrammeSettings,
  asOf: Date,
): ParticipantHealth {
  const progress = computeMonetaryOutcomeProgress(tradingStart.trading_start_date, entries, settings, asOf);

  if (progress.isAchieved) {
    return { tone: "green", label: "On Track", reasons: ["Outcome target already achieved."] };
  }
  if (progress.isOverdue) {
    return {
      tone: "red",
      label: "At Risk",
      reasons: [`Outcome deadline has passed without reaching the £${settings.outcome_target.toLocaleString("en-GB")} target.`],
    };
  }
  if (progress.monthsRemaining <= 0) {
    return { tone: "red", label: "At Risk", reasons: ["Deadline is this month and the target hasn't been reached."] };
  }

  const monthsElapsed = Math.max(1, progress.monthsElapsed);
  const actualMonthlyPace = progress.cumulativeProfit / monthsElapsed;
  const requiredMonthlyPace = progress.remaining / progress.monthsRemaining;
  const targetLabel = `£${settings.outcome_target.toLocaleString("en-GB")}`;

  if (requiredMonthlyPace <= 0 || actualMonthlyPace >= requiredMonthlyPace * ON_TRACK_PACE_RATIO) {
    return { tone: "green", label: "On Track", reasons: [`Current earnings pace meets what's needed to reach ${targetLabel} on time.`] };
  }
  if (actualMonthlyPace >= requiredMonthlyPace * NEEDS_ATTENTION_PACE_RATIO) {
    return {
      tone: "amber",
      label: "Needs Attention",
      reasons: [`Current earnings pace is below what's needed to reach ${targetLabel} on time.`],
    };
  }
  return {
    tone: "red",
    label: "At Risk",
    reasons: [`Current earnings pace is well below what's needed to reach ${targetLabel} on time.`],
  };
}

function gseHealth(
  tradingStart: TradingStart,
  reviews: IwtReview[],
  entries: IncomeTrackerEntry[],
  settings: ProgrammeSettings,
  asOf: Date,
): ParticipantHealth {
  const progress = computeGseOutcomeProgress(tradingStart.trading_start_date, settings, asOf);
  const reasons: string[] = [];

  const latestReview = reviews[0] ?? null;
  const missingReview = !latestReview || isReviewOverdue(latestReview.next_review_date, asOf);
  if (missingReview) reasons.push("An IWT review is overdue or has never been logged.");

  const missingDeclaration = isDeclarationMissing(entries, tradingStart.trading_start_date, asOf);
  if (missingDeclaration) reasons.push("This month's income declaration hasn't been received.");

  if (progress.readyToConfirm) {
    return {
      tone: reasons.length === 0 ? "green" : "amber",
      label: reasons.length === 0 ? "On Track" : "Needs Attention",
      reasons:
        reasons.length === 0
          ? [`${settings.gse_outcome_period_months}-month gainful period complete — ready to confirm the outcome.`]
          : reasons,
    };
  }

  const issueCount = (missingReview ? 1 : 0) + (missingDeclaration ? 1 : 0);
  if (issueCount === 0) {
    return { tone: "green", label: "On Track", reasons: ["Reviews and income declarations are up to date."] };
  }
  if (issueCount === 1) {
    return { tone: "amber", label: "Needs Attention", reasons };
  }
  return { tone: "red", label: "At Risk", reasons };
}

export function computeParticipantHealth(
  tradingStart: TradingStart,
  entries: IncomeTrackerEntry[],
  reviews: IwtReview[],
  settings: ProgrammeSettings,
  asOf: Date = new Date(),
): ParticipantHealth {
  return tradingStart.reason === "GSE"
    ? gseHealth(tradingStart, reviews, entries, settings, asOf)
    : monetaryHealth(tradingStart, entries, settings, asOf);
}
