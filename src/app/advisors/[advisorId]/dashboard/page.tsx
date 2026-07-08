import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining } from "@/lib/participant";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { detectNgseEligibility } from "@/lib/trading-start-rules";
import type { IncomeTrackerEntry, IwtReview, TradingStartReason } from "@/types/database";
import StatCard from "@/components/stat-card";
import Badge, { statusTone } from "@/components/badge";

const EXPIRING_THRESHOLD_DAYS = 30;

const REASON_LABEL: Record<TradingStartReason, string> = {
  GSE: "GSE",
  NGSE: "NGSE",
  "Claim Closed Whilst Self Employed": "Claim Closed",
};

function isThisMonth(dateStr: string, now: Date): boolean {
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const supabase = await createClient();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, ptp_name, business_name, scheme_start_date, status")
    .eq("advisor_id", advisorId)
    .order("scheme_start_date", { ascending: true });

  const rows = participants ?? [];
  const participantIds = rows.map((p) => p.id);

  const [{ data: businessPlans }, { data: actionItems }, { data: incomeEntries }, { data: originalTradingStarts }, { data: iwtTradingStarts }] =
    await Promise.all([
      participantIds.length
        ? supabase
            .from("business_plans")
            .select("participant_id, status")
            .in("participant_id", participantIds)
        : Promise.resolve({ data: [] }),
      participantIds.length
        ? supabase
            .from("action_plan_items")
            .select("id, participant_id, status, description, target_date")
            .in("participant_id", participantIds)
            .neq("status", "Complete")
        : Promise.resolve({ data: [] }),
      participantIds.length
        ? supabase
            .from("income_tracker_entries")
            .select("*")
            .in("participant_id", participantIds)
        : Promise.resolve({ data: [] as IncomeTrackerEntry[] }),
      supabase
        .from("trading_starts")
        .select("*")
        .eq("original_advisor_id", advisorId)
        .order("trading_start_date", { ascending: false }),
      supabase
        .from("trading_starts")
        .select("*")
        .eq("iwt_advisor_id", advisorId)
        .order("trading_start_date", { ascending: false }),
    ]);

  const businessPlanByParticipant = new Map(
    (businessPlans ?? []).map((bp) => [bp.participant_id, bp]),
  );

  const withDaysRemaining = rows.map((p) => ({
    ...p,
    daysRemaining: getDaysRemaining(p.scheme_start_date),
  }));

  const expiring = withDaysRemaining
    .filter((p) => p.daysRemaining <= EXPIRING_THRESHOLD_DAYS)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const missingBusinessPlans = rows.filter((p) => {
    const plan = businessPlanByParticipant.get(p.id);
    return !plan || plan.status === "Not Started";
  });

  const participantInfoById = new Map(
    rows.map((p) => [p.id, { name: p.ptp_name, business: p.business_name }]),
  );
  const outstandingActions = (actionItems ?? []).map((a) => ({
    ...a,
    participantId: a.participant_id,
    participantName: participantInfoById.get(a.participant_id)?.name ?? "",
  }));

  // Trading Start eligibility is only ever detected for participants still
  // active in this advisor's own caseload.
  const entriesByParticipant = new Map<string, IncomeTrackerEntry[]>();
  (incomeEntries ?? []).forEach((e) => {
    const list = entriesByParticipant.get(e.participant_id) ?? [];
    list.push(e);
    entriesByParticipant.set(e.participant_id, list);
  });
  const eligibleForTradingStart = rows.filter(
    (p) => p.status === "Active" && detectNgseEligibility(entriesByParticipant.get(p.id) ?? []).eligible,
  );

  const now = new Date();
  const tradingStartsThisMonth = (originalTradingStarts ?? []).filter((ts) =>
    isThisMonth(ts.trading_start_date, now),
  );

  // Names for original-advisor Trading Starts, since the participant may
  // since have moved to an IWT advisor's caseload and no longer be in `rows`.
  const originalTsParticipantIds = [...new Set((originalTradingStarts ?? []).map((ts) => ts.participant_id))];
  const missingParticipantIds = originalTsParticipantIds.filter((pid) => !participantInfoById.has(pid));
  const { data: extraParticipants } = missingParticipantIds.length
    ? await supabase.from("participants").select("id, ptp_name, business_name").in("id", missingParticipantIds)
    : { data: [] };
  (extraParticipants ?? []).forEach((p) => {
    participantInfoById.set(p.id, { name: p.ptp_name, business: p.business_name });
  });

  const iwtTsIds = (iwtTradingStarts ?? []).map((ts) => ts.id);
  const [{ data: iwtReviewsAll }, { data: outcomesAll }] = iwtTsIds.length
    ? await Promise.all([
        supabase
          .from("iwt_reviews")
          .select("*")
          .in("trading_start_id", iwtTsIds)
          .order("review_date", { ascending: false }),
        supabase.from("outcome_records").select("trading_start_id").in("trading_start_id", iwtTsIds),
      ])
    : [{ data: [] as IwtReview[] }, { data: [] as { trading_start_id: string }[] }];

  const outcomeTsIds = new Set((outcomesAll ?? []).map((o) => o.trading_start_id));
  const activeIwt = (iwtTradingStarts ?? []).filter((ts) => !outcomeTsIds.has(ts.id));
  const outcomeCaseload = (iwtTradingStarts ?? []).filter((ts) => outcomeTsIds.has(ts.id));

  const latestReviewByTsId = new Map<string, IwtReview>();
  (iwtReviewsAll ?? []).forEach((r) => {
    if (!latestReviewByTsId.has(r.trading_start_id)) {
      latestReviewByTsId.set(r.trading_start_id, r);
    }
  });

  const withNextReview = activeIwt.map((ts) => ({ ts, nextReviewDate: latestReviewByTsId.get(ts.id)?.next_review_date ?? null }));

  const upcomingReviews = withNextReview
    .filter((x) => x.nextReviewDate && new Date(x.nextReviewDate) >= now)
    .sort((a, b) => (a.nextReviewDate! < b.nextReviewDate! ? -1 : 1));

  const overdueReviews = withNextReview.filter((x) => x.nextReviewDate && new Date(x.nextReviewDate) < now);

  const participantsHref = `/advisors/${advisorId}/participants`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {advisor.full_name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s an overview of your caseload.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Caseload size" value={rows.length} href={participantsHref} />
        <StatCard
          label="Expiring soon"
          value={expiring.length}
          href={`${participantsHref}?filter=expiring`}
          tone={expiring.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Missing business plans"
          value={missingBusinessPlans.length}
          href={`${participantsHref}?filter=missing-plan`}
          tone={missingBusinessPlans.length > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Outstanding actions"
          value={outstandingActions.length}
          tone={outstandingActions.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Expiring participants
          </h2>
          {expiring.length === 0 ? (
            <p className="text-sm text-slate-500">
              No participants expiring within {EXPIRING_THRESHOLD_DAYS} days.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {expiring.slice(0, 6).map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link
                    href={`${participantsHref}/${p.id}`}
                    className="flex items-center justify-between text-sm hover:text-indigo-600"
                  >
                    <span className="font-medium text-slate-800">
                      {p.ptp_name}
                      <span className="ml-1 text-slate-500">
                        · {p.business_name}
                      </span>
                    </span>
                    <Badge tone={p.daysRemaining <= 0 ? "red" : "amber"}>
                      {p.daysRemaining <= 0
                        ? "Expired"
                        : `${p.daysRemaining} days left`}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Missing business plans
          </h2>
          {missingBusinessPlans.length === 0 ? (
            <p className="text-sm text-slate-500">
              Every participant has a business plan in progress or complete.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {missingBusinessPlans.slice(0, 6).map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link
                    href={`${participantsHref}/${p.id}?tab=business-plan`}
                    className="flex items-center justify-between text-sm hover:text-indigo-600"
                  >
                    <span className="font-medium text-slate-800">
                      {p.ptp_name}
                      <span className="ml-1 text-slate-500">
                        · {p.business_name}
                      </span>
                    </span>
                    <Badge tone="red">Not started</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Outstanding actions
          </h2>
          {outstandingActions.length === 0 ? (
            <p className="text-sm text-slate-500">
              No outstanding actions across your caseload.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {outstandingActions.slice(0, 8).map((a) => (
                <li key={a.id} className="py-2.5">
                  <Link
                    href={`${participantsHref}/${a.participantId}?tab=action-plan`}
                    className="flex items-center justify-between text-sm hover:text-indigo-600"
                  >
                    <span>
                      <span className="font-medium text-slate-800">
                        {a.participantName}
                      </span>
                      <span className="ml-1 text-slate-500">
                        · {a.description}
                      </span>
                    </span>
                    <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Trading Start, IWT &amp; Outcomes</h2>
        <p className="mt-1 text-sm text-slate-500">
          Trading Starts count towards you as the original advisor even after a participant
          transfers into In Work Tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Trading Starts this month" value={tradingStartsThisMonth.length} />
        <StatCard
          label="Eligible for Trading Start"
          value={eligibleForTradingStart.length}
          tone={eligibleForTradingStart.length > 0 ? "warning" : "default"}
        />
        <StatCard label="In Work Tracking" value={activeIwt.length} />
        <StatCard
          label="Upcoming reviews"
          value={upcomingReviews.length}
        />
        <StatCard
          label="Overdue reviews"
          value={overdueReviews.length}
          tone={overdueReviews.length > 0 ? "danger" : "default"}
        />
        <StatCard label="Outcome caseload" value={outcomeCaseload.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Eligible for Trading Start
          </h2>
          {eligibleForTradingStart.length === 0 ? (
            <p className="text-sm text-slate-500">
              No participants currently meet the two-consecutive-month NGSE threshold.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {eligibleForTradingStart.slice(0, 6).map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link
                    href={`${participantsHref}/${p.id}?tab=trading-start`}
                    className="flex items-center justify-between text-sm hover:text-indigo-600"
                  >
                    <span className="font-medium text-slate-800">
                      {p.ptp_name}
                      <span className="ml-1 text-slate-500">· {p.business_name}</span>
                    </span>
                    <Badge tone="green">Eligible</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Reviews due
          </h2>
          {upcomingReviews.length === 0 && overdueReviews.length === 0 ? (
            <p className="text-sm text-slate-500">No IWT reviews scheduled.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...overdueReviews, ...upcomingReviews].slice(0, 6).map(({ ts, nextReviewDate }) => {
                const info = participantInfoById.get(ts.participant_id);
                const overdue = new Date(nextReviewDate!) < now;
                return (
                  <li key={ts.id} className="py-2.5">
                    <Link
                      href={`${participantsHref}/${ts.participant_id}?tab=trading-start`}
                      className="flex items-center justify-between text-sm hover:text-indigo-600"
                    >
                      <span className="font-medium text-slate-800">
                        {info?.name ?? "Unknown"}
                        <span className="ml-1 text-slate-500">· {info?.business}</span>
                      </span>
                      <Badge tone={overdue ? "red" : "amber"}>
                        {overdue ? "Overdue" : new Date(nextReviewDate!).toLocaleDateString("en-GB")}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Trading Starts this month
          </h2>
          {tradingStartsThisMonth.length === 0 ? (
            <p className="text-sm text-slate-500">No Trading Starts recorded this month.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tradingStartsThisMonth.map((ts) => {
                const info = participantInfoById.get(ts.participant_id);
                return (
                  <li key={ts.id} className="py-2.5">
                    <Link
                      href={`${participantsHref}/${ts.participant_id}?tab=trading-start`}
                      className="flex items-center justify-between text-sm hover:text-indigo-600"
                    >
                      <span className="font-medium text-slate-800">
                        {info?.name ?? "Unknown"}
                        <span className="ml-1 text-slate-500">· {info?.business}</span>
                      </span>
                      <Badge tone="indigo">{REASON_LABEL[ts.reason]}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
