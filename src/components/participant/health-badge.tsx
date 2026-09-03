import type { HealthTone } from "@/lib/participant-health";
import Badge from "@/components/badge";

// Thin wrapper around the shared Badge primitive (Phase 1 consolidation).
// tone/label are still driven entirely by participant-health.ts's
// business logic — unchanged. size="lg" + dot reproduce this component's
// original px-3 py-1 font-semibold + coloured-dot styling exactly.
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
    <Badge tone={tone} size="lg" dot className={className}>
      {label}
    </Badge>
  );
}
