import type { Metadata } from "next";
import PortalFlow from "@/components/portal/portal-flow";

export const metadata: Metadata = {
  title: "Income Tracker — Max Self Employment Hub",
  description: "Submit your monthly income tracker entry.",
};

// Deliberately standalone: no AppShell, no nav, no links anywhere on this
// page or anything it renders. This route (and everything under
// src/components/portal) is the only part of the app a participant should
// ever be able to reach.
export default function PortalPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            SE
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Income Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">Max Self Employment Hub</p>
        </div>
        <PortalFlow />
      </div>
    </div>
  );
}
