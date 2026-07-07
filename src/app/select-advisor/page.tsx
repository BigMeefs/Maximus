import { listAdvisors, listOffices } from "@/lib/data/advisor";
import AdvisorSelector from "@/components/advisor-selector";

export default async function SelectAdvisorPage() {
  const [advisors, offices] = await Promise.all([
    listAdvisors({ activeOnly: true }),
    listOffices({ activeOnly: true }),
  ]);

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-4 py-12">
      <AdvisorSelector advisors={advisors} offices={offices} />
    </div>
  );
}
