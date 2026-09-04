import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

// Shared Button primitive — Phase 1 UI consolidation. Every class string
// below is copied verbatim from the most common existing usage of that
// variant/size across the app (see the UI audit), not a new visual style.
// A handful of one-off buttons with a genuinely unique combination of
// padding/weight/colour were deliberately left as local classNames rather
// than forced into a size here — see the Phase 1 report for the list.

type Variant = "primary" | "secondary" | "danger" | "success";
type Size = "xs" | "sm" | "compact" | "md";

const VARIANT_SIZE: Record<Variant, Partial<Record<Size, string>>> = {
  primary: {
    md: "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60",
    xs: "rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60",
    sm: "rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60",
  },
  secondary: {
    md: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
    sm: "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
    compact: "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
  },
  danger: {
    md: "rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50",
    compact: "rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60",
    xs: "rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60",
  },
  // Added Phase 4: three sites (Referral Accept, Funding Approve, Mark as
  // Reviewed) independently used the exact same bg-emerald-600 pattern at
  // exactly the existing xs/sm/md sizes — a genuine duplicate the Phase 1
  // sweep missed because it only looked for indigo/slate/red buttons.
  success: {
    md: "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50",
    sm: "rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60",
    xs: "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60",
  },
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type AsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

type AsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & { href: string };

export default function Button({ variant = "primary", size = "md", className, href, children, ...rest }: AsButton | AsLink) {
  const classes = clsx(VARIANT_SIZE[variant][size] ?? VARIANT_SIZE[variant].md, className);

  if (href) {
    return (
      <Link href={href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
