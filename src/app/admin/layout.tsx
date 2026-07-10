import AdminGate from "@/components/admin-gate";
import AdminShell from "@/components/admin-shell";
import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";

// This section must always be evaluated per-request (never statically
// prerendered) since access depends on a session cookie.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [orgSettings, logoUrl] = await Promise.all([getOrganisationSettings(), getOrganisationLogoUrl()]);

  return (
    <AdminGate redirectTo="/admin" title="Admin Login">
      <AdminShell section="admin" appName={orgSettings.app_name} logoUrl={logoUrl}>
        {children}
      </AdminShell>
    </AdminGate>
  );
}
