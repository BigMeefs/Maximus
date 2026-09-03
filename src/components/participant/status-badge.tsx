import type { ParticipantStatus } from "@/types/database";
import Badge from "@/components/badge";

// Thin wrapper around the shared Badge primitive (Phase 1 consolidation) —
// this file now only owns the status -> tone mapping (unchanged business
// logic), not the pill's visual rendering. size="lg" reproduces this
// component's original px-3 py-1 font-semibold styling exactly.
const STATUS_TONE: Record<ParticipantStatus, "slate" | "indigo" | "amber" | "blue" | "green" | "slate-dark"> = {
  Referral: "slate",
  Active: "indigo",
  "Trading Start": "amber",
  "In Work Tracking": "blue",
  "Outcome Achieved": "green",
  Closed: "slate-dark",
};

export default function StatusBadge({
  status,
  className,
}: {
  status: ParticipantStatus;
  className?: string;
}) {
  return (
    <Badge tone={STATUS_TONE[status]} size="lg" className={className}>
      {status}
    </Badge>
  );
}
