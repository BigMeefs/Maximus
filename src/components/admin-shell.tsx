"use client";

import { useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { logoutAdmin } from "@/lib/actions/admin-auth";

export default function AdminShell({
  section,
  children,
}: {
  section: "admin" | "reports";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loggingOut, startLogoutTransition] = useTransition();

  const links = [
    { href: "/admin", label: "Admin Dashboard" },
    { href: "/reports", label: "Reports" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                SE
              </div>
              <span className="text-sm font-semibold text-slate-900">Management Portal</span>
            </Link>
            <nav className="flex gap-1">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={clsx(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/select-advisor" className="text-sm text-slate-500 hover:text-indigo-600">
              ← Home
            </Link>
            <button
              type="button"
              disabled={loggingOut}
              onClick={() =>
                startLogoutTransition(() => logoutAdmin(section === "admin" ? "/admin" : "/reports"))
              }
              className="text-sm font-medium text-slate-600 hover:text-red-600 disabled:opacity-60"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
