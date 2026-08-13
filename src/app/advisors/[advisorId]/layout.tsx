import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getActiveNotificationCount } from "@/lib/data/notifications";
import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import { isAdvisorAuthenticated } from "@/lib/advisor-auth";
import AppShell from "@/components/app-shell";
import AdvisorPinForm from "@/components/advisor-pin-form";

export default async function AdvisorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const advisor = await getAdvisorOrNotFound(advisorId);
  const authed = await isAdvisorAuthenticated(advisorId);

  if (!authed) {
    // Every other advisor-specific data fetch is skipped until the PIN is
    // verified — the gate is the very first thing this layout checks, and
    // only org branding (needed to render the passcode screen itself) is
    // fetched ahead of it.
    const [orgSettings, logoUrl] = await Promise.all([getOrganisationSettings(), getOrganisationLogoUrl()]);
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-4">
        <AdvisorPinForm
          advisorId={advisorId}
          advisorName={advisor.full_name}
          redirectTo={`/advisors/${advisorId}/dashboard`}
          appName={orgSettings.app_name}
          logoUrl={logoUrl}
        />
      </div>
    );
  }

  // A cheap count against the notifications table — doesn't itself run the
  // (heavier) lazy-notification sync engine, which only runs when the
  // advisor opens their Dashboard or Notifications page. See
  // src/lib/data/notification-rules.ts for why.
  const [unreadCount, orgSettings, logoUrl] = await Promise.all([
    getActiveNotificationCount(advisorId),
    getOrganisationSettings(),
    getOrganisationLogoUrl(),
  ]);

  return (
    <AppShell advisor={advisor} unreadCount={unreadCount} appName={orgSettings.app_name} logoUrl={logoUrl}>
      {children}
    </AppShell>
  );
}
