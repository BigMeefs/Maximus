"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  ArrowRightLeft,
  Banknote,
  SlidersHorizontal,
  Settings,
  Megaphone,
  BarChart3,
  Target,
  TrendingUp,
  History,
} from "lucide-react";
import { logoutAdmin } from "@/lib/actions/admin-auth";
import SidebarShell from "@/components/ui/sidebar-shell";
import SidebarNav from "@/components/ui/sidebar-nav";

export default function AdminShell({
  section,
  appName,
  logoUrl,
  children,
}: {
  section: "admin" | "reports";
  appName: string;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const [loggingOut, startLogoutTransition] = useTransition();

  const groups = [
    { label: "Overview", items: [{ href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard }] },
    {
      label: "People & Offices",
      items: [
        { href: "/admin/offices", label: "Offices", icon: Building2 },
        { href: "/admin/advisors", label: "Advisors", icon: Users },
        { href: "/admin/transfer", label: "Transfer Participants", icon: ArrowRightLeft },
      ],
    },
    {
      label: "Approvals & Settings",
      items: [
        { href: "/admin/funding-approvals", label: "Funding Approval Queue", icon: Banknote },
        { href: "/admin/programme-settings", label: "Programme Settings", icon: SlidersHorizontal },
        { href: "/admin/organisation-settings", label: "Organisation Settings", icon: Settings },
        { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      ],
    },
    {
      label: "Reporting",
      items: [
        { href: "/reports", label: "Reports", icon: BarChart3 },
        { href: "/admin/performance", label: "Performance Targets", icon: Target },
        { href: "/reports/performance-tracker", label: "Performance Tracker", icon: TrendingUp },
      ],
    },
    { label: "Audit", items: [{ href: "/admin/notifications", label: "Notification History", icon: History }] },
  ];

  return (
    <SidebarShell
      brandHref="/admin"
      appName={`${appName} — Management`}
      logoUrl={logoUrl}
      nav={<SidebarNav groups={groups} />}
      footer={
        <div className="space-y-2">
          <Link
            href="/select-advisor"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            ← Home
          </Link>
          <button
            type="button"
            disabled={loggingOut}
            onClick={() => startLogoutTransition(() => logoutAdmin(section === "admin" ? "/admin" : "/reports"))}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:opacity-60"
          >
            Log out
          </button>
        </div>
      }
    >
      {children}
    </SidebarShell>
  );
}
