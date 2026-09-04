"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactNode } from "react";

// Shared sidebar navigation list — Phase 3, icons added in Phase 4. Used by
// both the advisor workspace shell and the admin/reports shell so the two
// areas share one navigation language (grouped links, same active-state
// treatment, same icon size/weight) even though they remain separate,
// separately-authenticated areas (per-advisor PIN session vs. shared admin
// passcode session — see AGENTS.md / README). This component only renders
// links; it grants no access on its own.
export type SidebarNavItem = { href: string; label: string; icon?: ReactNode; badge?: number };
export type SidebarNavGroup = { label?: string; items: SidebarNavItem[] };

export default function SidebarNav({ groups, onNavigate }: { groups: SidebarNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  // Pick the single longest (most specific) matching href across the whole
  // nav, not just a per-item prefix check — otherwise a root item like
  // "/admin" would stay highlighted on every "/admin/..." subpage even
  // though a more specific item (e.g. "Offices") also matches.
  const allHrefs = groups.flatMap((g) => g.items.map((item) => item.href));
  const activeHref = allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-4 px-3">
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
          )}
          {group.items.map((item) => (
            <NavItem key={item.href} item={item} active={item.href === activeHref} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: SidebarNavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
        active ? "bg-[var(--brand-primary)] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            active ? "bg-white/20 text-white" : "bg-red-100 text-red-700",
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
