import { getAdvisorCaseloadCounts, listAdvisors, listOffices } from "@/lib/data/advisor";
import AdvisorList from "@/components/admin/advisor-list";

export default async function AdminAdvisorsPage() {
  const [advisors, offices, caseloadCounts] = await Promise.all([
    listAdvisors(),
    listOffices({ activeOnly: true }),
    getAdvisorCaseloadCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Advisors</h1>
        <p className="mt-1 text-sm text-slate-500">
          Unlimited advisors — add one and they immediately appear on the home screen.
        </p>
      </div>
      <AdvisorList advisors={advisors} offices={offices} caseloadCounts={caseloadCounts} />
    </div>
  );
}
