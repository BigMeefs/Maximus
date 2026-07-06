import clsx from "clsx";

const toneClasses: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  indigo: "bg-indigo-100 text-indigo-700",
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

export default function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
