"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/brand-mark";

// Shared shell layout — Phase 3. Desktop sidebar + mobile slide-down drawer,
// used by both the advisor workspace and the admin/reports console so both
// areas share one navigational shell instead of a sidebar in one and a top
// bar in the other. `nav` and `footer` are supplied by the caller (they
// differ: advisor identity + "All advisors" link vs. admin log-out), so this
// component owns layout/responsive behaviour only, not what's authenticated
// or which links exist.
export default function SidebarShell({
  brandHref,
  appName,
  logoUrl,
  nav,
  footer,
  children,
}: {
  brandHref: string;
  appName: string;
  logoUrl: string | null;
  nav: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white py-6 md:flex">
        <Link href={brandHref} className="mb-6 flex items-center gap-2 px-4">
          <BrandMark logoUrl={logoUrl} size="md" />
          <span className="text-sm font-semibold leading-tight text-slate-900">{appName}</span>
        </Link>
        {nav}
        {footer && <div className="mt-auto border-t border-slate-200 px-3 pt-4">{footer}</div>}
      </aside>

      {/* Mobile top bar + slide-down drawer */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link href={brandHref} className="flex items-center gap-2">
            <BrandMark logoUrl={logoUrl} size="sm" />
            <span className="text-sm font-semibold text-slate-900">{appName}</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </header>

        {mobileOpen && (
          <div id="mobile-nav-drawer" className="border-b border-slate-200 bg-white px-3 pb-4 md:hidden">
            {nav}
            {footer && <div className="mt-3 border-t border-slate-200 px-3 pt-3">{footer}</div>}
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
