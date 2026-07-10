import type { ChecklistEntry } from "@/lib/business-rules";
import type { EvidenceFile, GainfulAssessment } from "@/types/database";
import GatewayAssessmentCard from "@/components/participant/gateway-tab";
import GainfulDecisionCard from "@/components/participant/gainful-tab";

// Gateway and Gainful Decision used to be separate tabs; a Gateway now
// covers what the standalone "Gainful Assessment" step used to (see the
// Journey tab), so they live together here as one workflow. Nothing from
// either original tab was removed — this just presents them as two clearly
// labelled cards instead of two clicks apart.
export default function GatewayCombinedTab({
  participantId,
  gatewayEntries,
  gatewayPercent,
  gatewayTargetDate,
  gatewayNotes,
  gainfulEntries,
  gainfulPercent,
  gainful,
  evidenceFiles,
}: {
  participantId: string;
  gatewayEntries: ChecklistEntry[];
  gatewayPercent: number;
  gatewayTargetDate: string | null;
  gatewayNotes: string | null;
  gainfulEntries: ChecklistEntry[];
  gainfulPercent: number;
  gainful: GainfulAssessment | null;
  evidenceFiles: EvidenceFile[];
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <GatewayAssessmentCard
        participantId={participantId}
        entries={gatewayEntries}
        percent={gatewayPercent}
        gatewayTargetDate={gatewayTargetDate}
        gatewayNotes={gatewayNotes}
      />
      <GainfulDecisionCard
        participantId={participantId}
        entries={gainfulEntries}
        percent={gainfulPercent}
        gainful={gainful}
        evidenceFiles={evidenceFiles}
      />
    </div>
  );
}
