import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import OrganisationSettingsForm from "@/components/admin/organisation-settings-form";

export default async function OrganisationSettingsPage() {
  const [settings, logoUrl] = await Promise.all([getOrganisationSettings(), getOrganisationLogoUrl()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Organisation Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rebrand the app for a different organisation or contract without touching code — the
          name, logo and brand colours here apply throughout the system. Nothing is hard-coded.
        </p>
      </div>
      <OrganisationSettingsForm settings={settings} logoUrl={logoUrl} />
    </div>
  );
}
