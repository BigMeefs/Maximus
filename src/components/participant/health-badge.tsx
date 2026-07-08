import clsx from "clsx";
import type { HealthTone } from "@/lib/participant-health";

const TONE_CLASSES: Record<HealthTone, string> = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const TONE_DOT: Record<HealthTone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export default function HealthBadge({
  tone,
  label,
  className,
}: {
  tone: HealthTone;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={clsx("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} />
      {label}
    </span>
  );
}
