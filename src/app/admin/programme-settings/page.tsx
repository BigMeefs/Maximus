import { getProgrammeSettings } from "@/lib/data/programme-settings";
import ProgrammeSettingsForm from "@/components/admin/programme-settings-form";
import PageHeader from "@/components/ui/page-header";

export default async function ProgrammeSettingsPage() {
  const settings = await getProgrammeSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Programme Settings"
        description="The thresholds and monitoring periods that drive Trading Start eligibility and Outcome tracking throughout the CRM. Nothing here is hard-coded — every calculation reads these values live."
      />
      <ProgrammeSettingsForm settings={settings} />
    </div>
  );
}
