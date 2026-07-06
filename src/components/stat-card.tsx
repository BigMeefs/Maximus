import Link from "next/link";
import clsx from "clsx";

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
  const content = (
    <div
      className={clsx(
        "rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        tone === "warning" && "border-amber-200",
        tone === "danger" && "border-red-200",
        tone === "default" && "border-slate-200",
      )}
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={clsx(
          "mt-2 text-3xl font-semibold",
          tone === "warning" && "text-amber-600",
          tone === "danger" && "text-red-600",
          tone === "default" && "text-slate-900",
        )}
      >
        {value}
      </p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
