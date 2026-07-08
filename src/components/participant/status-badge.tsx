import clsx from "clsx";
import type { ParticipantStatus } from "@/types/database";

const STATUS_TONE: Record<ParticipantStatus, string> = {
  Referral: "bg-slate-100 text-slate-700",
  Active: "bg-indigo-100 text-indigo-700",
  "Trading Start": "bg-amber-100 text-amber-700",
  "In Work Tracking": "bg-blue-100 text-blue-700",
  "Outcome Achieved": "bg-emerald-100 text-emerald-700",
  Closed: "bg-slate-200 text-slate-600",
};

export default function StatusBadge({
  status,
  className,
}: {
  status: ParticipantStatus;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        STATUS_TONE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
