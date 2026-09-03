import { listAdvisors, listOffices } from "@/lib/data/advisor";
import OfficeList from "@/components/admin/office-list";
import PageHeader from "@/components/ui/page-header";

export default async function AdminOfficesPage() {
  const [offices, advisors] = await Promise.all([listOffices(), listAdvisors()]);

  const advisorCountByOffice = new Map<string, number>();
  for (const advisor of advisors) {
    advisorCountByOffice.set(advisor.office_id, (advisorCountByOffice.get(advisor.office_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offices"
        description="Unlimited offices — archiving an office hides it from new advisor assignments without affecting advisors or participants already linked to it."
      />
      <OfficeList offices={offices} advisorCountByOffice={advisorCountByOffice} />
    </div>
  );
}
