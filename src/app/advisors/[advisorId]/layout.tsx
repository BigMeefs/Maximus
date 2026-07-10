import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getUnreviewedCountForAdvisor } from "@/lib/data/notifications";
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
  const [advisor, unreadCount, orgSettings, logoUrl] = await Promise.all([
    getAdvisorOrNotFound(advisorId),
    getUnreviewedCountForAdvisor(advisorId),
    getOrganisationSettings(),
    getOrganisationLogoUrl(),
  ]);

  return (
    <AppShell advisor={advisor} unreadCount={unreadCount} appName={orgSettings.app_name} logoUrl={logoUrl}>
      {children}
    </AppShell>
  );
}
