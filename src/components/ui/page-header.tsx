import type { ReactNode } from "react";

// Shared page-header primitive — Phase 2 design-system consolidation of the
// title + description (+ optional actions) block that was pasted verbatim
// at the top of ~26 pages. Markup and classes are copied exactly from the
// dominant existing pattern (text-2xl font-semibold title, mt-1 text-sm
// muted description) — this is not a new visual style.
export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
