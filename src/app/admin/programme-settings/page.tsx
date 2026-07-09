import { getProgrammeSettings } from "@/lib/data/programme-settings";
import ProgrammeSettingsForm from "@/components/admin/programme-settings-form";

export default async function ProgrammeSettingsPage() {
  const settings = await getProgrammeSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Programme Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          The thresholds and monitoring periods that drive Trading Start eligibility and Outcome
          tracking throughout the CRM. Nothing here is hard-coded — every calculation reads these
          values live.
        </p>
      </div>
      <ProgrammeSettingsForm settings={settings} />
    </div>
  );
}
