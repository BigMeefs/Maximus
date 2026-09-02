import type { Metadata } from "next";
import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import { listReferralAdvisors } from "@/lib/data/referrals";
import { submitReferral } from "@/lib/actions/referrals";
import BrandMark from "@/components/brand-mark";
import ReferralFlow from "@/components/portal/referral-flow";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getOrganisationSettings();
  return {
    title: `Refer a Participant — ${settings.app_name}`,
    description: "Suggest a participant who may be interested in exploring self employment.",
  };
}

// Deliberately standalone, same as /portal: no AppShell, no nav, no links
// anywhere on this page or anything it renders. This is the only part of
// the app a colleague without Hub access should ever be able to reach.
export default async function ReferralPage() {
  const [settings, logoUrl, advisors] = await Promise.all([
    getOrganisationSettings(),
    getOrganisationLogoUrl(),
    listReferralAdvisors(),
  ]);

  // Every option is a separately-bound copy of the same Server Action —
  // the advisor id/name are baked into the opaque action reference
  // server-side and never reach the browser as plain data (unlike a
  // hidden form field), so the client only ever sees the display name.
  const options = [
    ...advisors.map((a) => ({ name: a.name, action: submitReferral.bind(null, a.id, a.name) })),
    { name: "No preference", action: submitReferral.bind(null, null, null) },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3">
            <BrandMark logoUrl={logoUrl} size="sm" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Refer a Participant for Self Employment</h1>
          <p className="mt-1 text-sm text-slate-500">{settings.app_name}</p>
        </div>

        <ReferralFlow options={options} />
      </div>
    </div>
  );
}
