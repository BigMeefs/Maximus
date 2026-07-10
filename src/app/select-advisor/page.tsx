import Link from "next/link";
import { listAdvisors, listOffices } from "@/lib/data/advisor";
import AdvisorSelector from "@/components/advisor-selector";

export default async function SelectAdvisorPage() {
  const [advisors, offices] = await Promise.all([
    listAdvisors({ activeOnly: true }),
    listOffices({ activeOnly: true }),
  ]);

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-4 py-12">
      <Link
        href="/admin"
        className="absolute right-4 top-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 sm:right-6 sm:top-6"
      >
        Admin Login
      </Link>
      <AdvisorSelector advisors={advisors} offices={offices} />
    </div>
  );
}
