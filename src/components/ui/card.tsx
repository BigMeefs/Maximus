import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

// Shared card/surface primitive — Phase 2 design-system consolidation of the
// "rounded-xl border border-slate-200 bg-white ... shadow-sm" container
// pasted across ~30 files. The three padding sizes below are the three
// paddings actually in use (p-4 / p-5 / p-6) — nothing is merged into a
// single size, so no existing card's spacing changes just by adopting this.
const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

// Border colour is a variant of Card itself (not a caller-supplied
// className) so it can never collide with the base border-slate-200 class —
// two conflicting `border-*` utilities in one class string is resolved by
// stylesheet order, not source order, which is exactly the override
// footgun Phase 1's Button primitive was designed to avoid.
const TONE_BORDER = {
  default: "border-slate-200",
  warning: "border-amber-200",
  danger: "border-red-200",
};

export default function Card({
  padding = "md",
  tone = "default",
  hoverable = false,
  href,
  className,
  children,
}: {
  padding?: keyof typeof PADDING;
  tone?: keyof typeof TONE_BORDER;
  hoverable?: boolean;
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  const classes = clsx(
    "rounded-xl border bg-white shadow-sm",
    TONE_BORDER[tone],
    hoverable && "transition-shadow hover:shadow-md",
    PADDING[padding],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
