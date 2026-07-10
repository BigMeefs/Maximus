import type { Metadata } from "next";
import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import BrandMark from "@/components/brand-mark";
import PortalFlow from "@/components/portal/portal-flow";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getOrganisationSettings();
  return {
    title: `Income Tracker — ${settings.app_name}`,
    description: "Submit your monthly income tracker entry.",
  };
}

// Deliberately standalone: no AppShell, no nav, no links anywhere on this
// page or anything it renders. This route (and everything under
// src/components/portal) is the only part of the app a participant should
// ever be able to reach.
export default async function PortalPage() {
  const [settings, logoUrl] = await Promise.all([getOrganisationSettings(), getOrganisationLogoUrl()]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3">
            <BrandMark logoUrl={logoUrl} size="sm" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Income Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">{settings.app_name}</p>
        </div>
        <PortalFlow />
      </div>
    </div>
  );
}
