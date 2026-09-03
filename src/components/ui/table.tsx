import type { ReactNode, ThHTMLAttributes } from "react";
import clsx from "clsx";

// Shared table + table-header primitives — Phase 1 UI consolidation of the
// header markup that was pasted verbatim across ~16-20 tables. Composable
// on purpose: Table/THead/Th only own the wrapper styling, so a table with
// custom interactive header content (e.g. the sortable Team Leaderboard,
// which puts its own <button onClick> inside each <th>) keeps that
// behaviour unchanged — only its outer classNames move here.

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return <table className={clsx("w-full text-left text-sm", className)}>{children}</table>;
}

export function THead({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <thead
      className={clsx(
        "border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function Th({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={clsx("px-4 py-3", className)} {...rest}>
      {children}
    </th>
  );
}

export function TBody({ className, children }: { className?: string; children: ReactNode }) {
  return <tbody className={clsx("divide-y divide-slate-100", className)}>{children}</tbody>;
}
