"use client";

import { useState } from "react";
import Link from "next/link";
import NavLinks from "@/components/nav-links";
import SignOutButton from "@/components/sign-out-button";

export default function AppShell({
  advisorName,
  children,
}: {
  advisorName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white py-6 md:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            SE
          </div>
          <span className="text-sm font-semibold leading-tight text-slate-900">
            Caseload
            <br />
            Manager
          </span>
        </Link>
        <NavLinks />
        <div className="mt-auto flex items-center justify-between border-t border-slate-200 px-4 pt-4">
          <div className="text-sm">
            <p className="font-medium text-slate-900">{advisorName}</p>
            <p className="text-xs text-slate-500">Advisor</p>
          </div>
        </div>
        <div className="px-3 pt-2">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              SE
            </div>
            <span className="text-sm font-semibold text-slate-900">
              Caseload Manager
            </span>
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
            <NavLinks />
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 px-3 pt-3">
              <div className="text-sm">
                <p className="font-medium text-slate-900">{advisorName}</p>
                <p className="text-xs text-slate-500">Advisor</p>
              </div>
              <SignOutButton />
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
