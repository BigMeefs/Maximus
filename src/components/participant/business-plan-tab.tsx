import type { BusinessPlan } from "@/types/database";
import BusinessPlanStatusSelect from "@/components/participant/business-plan-status-select";
import BusinessPlanFile from "@/components/participant/business-plan-file";

export default function BusinessPlanTab({
  participantId,
  businessPlan,
}: {
  participantId: string;
  businessPlan: BusinessPlan | null;
}) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Status</h3>
        <BusinessPlanStatusSelect
          participantId={participantId}
          status={businessPlan?.status ?? "Not Started"}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-900">
          Business plan document (optional)
        </h3>
        <BusinessPlanFile
          participantId={participantId}
          filePath={businessPlan?.file_path ?? null}
          fileName={businessPlan?.file_name ?? null}
        />
      </div>
    </div>
  );
}
