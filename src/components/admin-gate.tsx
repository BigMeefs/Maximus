import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import AdminLoginForm from "@/components/admin-login-form";

export default async function AdminGate({
  children,
  redirectTo,
  title,
}: {
  children: React.ReactNode;
  redirectTo: string;
  title: string;
}) {
  const authed = await isAdminAuthenticated();

  if (!authed) {
    const [orgSettings, logoUrl] = await Promise.all([getOrganisationSettings(), getOrganisationLogoUrl()]);
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50 px-4">
        <AdminLoginForm redirectTo={redirectTo} title={title} appName={orgSettings.app_name} logoUrl={logoUrl} />
      </div>
    );
  }

  return <>{children}</>;
}
