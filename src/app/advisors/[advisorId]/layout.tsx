import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getActiveNotificationCount } from "@/lib/data/notifications";
import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import AppShell from "@/components/app-shell";

export default async function AdvisorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  // A cheap count against the notifications table — doesn't itself run the
  // (heavier) lazy-notification sync engine, which only runs when the
  // advisor opens their Dashboard or Notifications page. See
  // src/lib/data/notification-rules.ts for why.
  const [advisor, unreadCount, orgSettings, logoUrl] = await Promise.all([
    getAdvisorOrNotFound(advisorId),
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
