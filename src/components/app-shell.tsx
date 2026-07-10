"use client";

import { useState } from "react";
import Link from "next/link";
import NavLinks from "@/components/nav-links";
import BackToAdvisorsLink from "@/components/back-to-advisors-link";
import BrandMark from "@/components/brand-mark";
import type { AdvisorWithOffice } from "@/lib/data/advisor";

export default function AppShell({
  advisor,
  unreadCount = 0,
  appName,
  logoUrl,
  children,
}: {
  advisor: AdvisorWithOffice;
  unreadCount?: number;
  appName: string;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dashboardHref = `/advisors/${advisor.id}/dashboard`;

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white py-6 md:flex">
        <Link href={dashboardHref} className="mb-6 flex items-center gap-2 px-4">
          <BrandMark logoUrl={logoUrl} size="md" />
          <span className="text-sm font-semibold leading-tight text-slate-900">{appName}</span>
        </Link>
        <NavLinks advisorId={advisor.id} unreadCount={unreadCount} />
        <div className="mt-auto flex items-center justify-between border-t border-slate-200 px-4 pt-4">
          <div className="text-sm">
            <p className="font-medium text-slate-900">{advisor.full_name}</p>
            <p className="text-xs text-slate-500">
              {advisor.job_title || "Advisor"} · {advisor.office_name}
            </p>
          </div>
        </div>
        <div className="px-3 pt-2">
          <BackToAdvisorsLink />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link href={dashboardHref} className="flex items-center gap-2">
            <BrandMark logoUrl={logoUrl} size="sm" />
            <span className="text-sm font-semibold text-slate-900">{appName}</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </header>

        {mobileOpen && (
          <div className="border-b border-slate-200 bg-white px-3 pb-4 md:hidden">
            <NavLinks advisorId={advisor.id} unreadCount={unreadCount} />
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 px-3 pt-3">
              <div className="text-sm">
                <p className="font-medium text-slate-900">{advisor.full_name}</p>
                <p className="text-xs text-slate-500">
                  {advisor.job_title || "Advisor"} · {advisor.office_name}
                </p>
              </div>
              <BackToAdvisorsLink />
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
