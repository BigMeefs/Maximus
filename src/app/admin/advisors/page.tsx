import { getAdvisorCaseloadCounts, listAdvisors, listOffices } from "@/lib/data/advisor";
import AdvisorList from "@/components/admin/advisor-list";
import PageHeader from "@/components/ui/page-header";

export default async function AdminAdvisorsPage() {
  const [advisors, offices, caseloadCounts] = await Promise.all([
    listAdvisors(),
    listOffices({ activeOnly: true }),
    getAdvisorCaseloadCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advisors"
        description="Unlimited advisors — add one and they immediately appear on the home screen."
      />
      <AdvisorList advisors={advisors} offices={offices} caseloadCounts={caseloadCounts} />
    </div>
  );
}
