import Link from "next/link";
import { ADVISOR_NAMES } from "@/lib/constants";

export default function SelectAdvisorPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            SE
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Self Employment Caseload Manager
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select an advisor to open their workspace
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {ADVISOR_NAMES.map((name) => (
            <Link
              key={name}
              href={`/advisors/${name}/dashboard`}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-800 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
