import clsx from "clsx";
import Card from "@/components/ui/card";

// Phase 2: stronger number/label hierarchy (bolder value; smaller, uppercase
// caption label — the same caption convention already used for the
// participant-profile detail labels), now built on the shared Card
// primitive. Tone colours, the underlying metric, and href behaviour are
// all unchanged from Phase 1.
export default function StatCard({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card href={href} tone={tone} hoverable>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={clsx(
          "mt-2 text-3xl font-bold tabular-nums",
          tone === "warning" && "text-amber-600",
          tone === "danger" && "text-red-600",
          tone === "default" && "text-slate-900",
        )}
      >
        {value}
      </p>
    </Card>
  );
}
