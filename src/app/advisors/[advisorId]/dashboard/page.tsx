import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining } from "@/lib/participant";
import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import StatCard from "@/components/stat-card";
import Badge, { statusTone } from "@/components/badge";

const EXPIRING_THRESHOLD_DAYS = 30;

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

  const [{ data: businessPlans }, { data: actionItems }, { data: fundingRecords }, { data: incomeEntries }] =
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
            .from("funding_records")
            .select("id, participant_id, application_status, amount_requested, amount_approved, decision_date")
            .in("participant_id", participantIds)
            .order("decision_date", { ascending: false })
        : Promise.resolve({ data: [] }),
      participantIds.length
        ? supabase.from("income_tracker_entries").select("participant_id, month").in("participant_id", participantIds)
        : Promise.resolve({ data: [] }),
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

  const fundingRows = (fundingRecords ?? []).map((f) => ({
    ...f,
    participantName: participantInfoById.get(f.participant_id)?.name ?? "",
  }));
  const pendingFunding = fundingRows.filter(
    (f) => f.application_status === "Pending Manager Approval",
  );
  const recentFundingDecisions = fundingRows.filter(
    (f) => f.application_status === "Approved" || f.application_status === "Declined",
  );

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const latestIncomeMonthByParticipant = new Map<string, string>();
  for (const e of incomeEntries ?? []) {
    const existing = latestIncomeMonthByParticipant.get(e.participant_id);
    if (!existing || e.month > existing) latestIncomeMonthByParticipant.set(e.participant_id, e.month);
  }
  const incomeTrackerAlerts = rows.filter(
    (p) =>
      p.status === "Active" &&
      latestIncomeMonthByParticipant.get(p.id)?.slice(0, 7) !== currentMonthKey,
  );

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
        <StatCard
          label="Funding awaiting approval"
          value={pendingFunding.length}
          tone={pendingFunding.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Income Tracker alerts"
          value={incomeTrackerAlerts.length}
          tone={incomeTrackerAlerts.length > 0 ? "warning" : "default"}
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

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Funding</h2>
          {pendingFunding.length === 0 && recentFundingDecisions.length === 0 ? (
            <p className="text-sm text-slate-500">No funding activity across your caseload.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pendingFunding.slice(0, 5).map((f) => (
                <li key={f.id} className="py-2.5">
                  <Link
                    href={`${participantsHref}/${f.participant_id}?tab=funding`}
                    className="flex items-center justify-between text-sm hover:text-indigo-600"
                  >
                    <span className="font-medium text-slate-800">{f.participantName}</span>
                    <Badge tone="amber">Awaiting approval</Badge>
                  </Link>
                </li>
              ))}
              {recentFundingDecisions.slice(0, 5).map((f) => (
                <li key={f.id} className="py-2.5">
                  <Link
                    href={`${participantsHref}/${f.participant_id}?tab=funding`}
                    className="flex items-center justify-between text-sm hover:text-indigo-600"
                  >
                    <span className="font-medium text-slate-800">{f.participantName}</span>
                    <Badge tone={f.application_status === "Approved" ? "green" : "red"}>
                      {f.application_status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Income Tracker alerts</h2>
          {incomeTrackerAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Every active participant has logged income for {currentMonthKey}.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {incomeTrackerAlerts.slice(0, 6).map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link
                    href={`${participantsHref}/${p.id}?tab=income-tracker`}
                    className="flex items-center justify-between text-sm hover:text-indigo-600"
                  >
                    <span className="font-medium text-slate-800">
                      {p.ptp_name}
                      <span className="ml-1 text-slate-500">· {p.business_name}</span>
                    </span>
                    <Badge tone="amber">No entry this month</Badge>
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

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">
          Trading Starts, In Work Tracking, Outcomes and earnings analysis have moved to the
          dedicated{" "}
          <Link href={`/advisors/${advisorId}/self-employment`} className="font-medium text-indigo-600 hover:underline">
            Self Employment dashboard
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
