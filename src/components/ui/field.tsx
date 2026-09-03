import type { ReactNode } from "react";
import clsx from "clsx";

// Shared form-field wrapper — Phase 1 UI consolidation of the label +
// required-indicator pattern that was locally reimplemented in ~10 files.
// Two label sizes existed in the original implementations (most forms use
// the smaller "sm"; participant-form.tsx and hmrc-tab.tsx use the larger
// "md" with htmlFor wiring) — both are preserved exactly, not merged into
// one, so no existing form's appearance changes.
export default function Field({
  label,
  htmlFor,
  required,
  size = "sm",
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className={clsx(
          "mb-1 block font-medium",
          size === "md" ? "text-sm text-slate-700" : "text-xs text-slate-600",
        )}
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
