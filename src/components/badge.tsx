import clsx from "clsx";

const toneClasses: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  indigo: "bg-indigo-100 text-indigo-700",
  blue: "bg-blue-100 text-blue-700",
  // Slightly darker slate used only for a "Closed" participant status —
  // preserved as its own tone (not merged into "slate") so every other
  // slate badge in the app keeps its exact current colour.
  "slate-dark": "bg-slate-200 text-slate-600",
};

const dotClasses: Record<string, string> = {
  slate: "bg-slate-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
  blue: "bg-blue-500",
  "slate-dark": "bg-slate-500",
};

export function statusTone(status: string): keyof typeof toneClasses {
  switch (status) {
    case "Complete":
      return "green";
    case "In Progress":
      return "amber";
    case "Not Started":
      return "slate";
    default:
      return "indigo";
  }
}

// Shared status-pill primitive — Phase 1 UI consolidation of Badge,
// StatusBadge and HealthBadge into one visual implementation.
// `size="sm"` (default) is Badge's original rendering, unchanged;
// `size="lg"` reproduces StatusBadge/HealthBadge's original
// px-3 py-1 font-semibold pixel-for-pixel, and `dot` reproduces
// HealthBadge's coloured indicator. StatusBadge and HealthBadge are now
// thin wrappers around this component — see those files.
export default function Badge({
  children,
  tone = "slate",
  size = "sm",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClasses;
  size?: "sm" | "lg";
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full",
        size === "lg" ? "gap-1.5 px-3 py-1 text-xs font-semibold" : "px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={clsx("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />}
      {children}
    </span>
  );
}
