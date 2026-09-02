import type { Metadata } from "next";
import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import { getAdvisorByReferralToken } from "@/lib/data/referrals";
import BrandMark from "@/components/brand-mark";
import ReferralForm from "@/components/portal/referral-form";

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
export default async function ReferralPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [settings, logoUrl, advisor] = await Promise.all([
    getOrganisationSettings(),
    getOrganisationLogoUrl(),
    getAdvisorByReferralToken(token),
  ]);

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

        {advisor ? (
          <ReferralForm advisorId={advisor.advisorId} advisorName={advisor.advisorName} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              This referral link is not valid. Please check the link or contact the advisor who shared
              it with you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
