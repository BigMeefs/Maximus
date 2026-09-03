import { getOrganisationLogoUrl, getOrganisationSettings } from "@/lib/data/organisation-settings";
import OrganisationSettingsForm from "@/components/admin/organisation-settings-form";
import PageHeader from "@/components/ui/page-header";

export default async function OrganisationSettingsPage() {
  const [settings, logoUrl] = await Promise.all([getOrganisationSettings(), getOrganisationLogoUrl()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisation Settings"
        description="Rebrand the app for a different organisation or contract without touching code — the name, logo and brand colours here apply throughout the system. Nothing is hard-coded."
      />
      <OrganisationSettingsForm settings={settings} logoUrl={logoUrl} />
    </div>
  );
}
