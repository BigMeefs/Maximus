import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDaysRemaining } from "@/lib/participant";
import type { AdvisorName } from "@/lib/constants";
import StatCard from "@/components/stat-card";
import Badge, { statusTone } from "@/components/badge";

const EXPIRING_THRESHOLD_DAYS = 30;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ advisor: string }>;
}) {
  const { advisor } = (await params) as { advisor: AdvisorName };
  const supabase = await createClient();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, ptp_name, business_name, scheme_start_date")
    .eq("advisor_name", advisor)
    .order("scheme_start_date", { ascending: true });

  const rows = participants ?? [];
  const participantIds = rows.map((p) => p.id);

  const [{ data: businessPlans }, { data: actionItems }] = await Promise.all([
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

  const participantNameById = new Map(rows.map((p) => [p.id, p.ptp_name]));
  const outstandingActions = (actionItems ?? []).map((a) => ({
    ...a,
    participantId: a.participant_id,
    participantName: participantNameById.get(a.participant_id) ?? "",
  }));

  const participantsHref = `/advisors/${advisor}/participants`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Welcome back, {advisor}
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
    </div>
  );
}
