import { LayoutDashboard, TrendingUp, Users, Mail, Bell, RefreshCw } from "lucide-react";
import SidebarShell from "@/components/ui/sidebar-shell";
import SidebarNav from "@/components/ui/sidebar-nav";
import BackToAdvisorsLink from "@/components/back-to-advisors-link";
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
  const dashboardHref = `/advisors/${advisor.id}/dashboard`;

  const iconProps = { "aria-hidden": true, className: "h-4 w-4 shrink-0", strokeWidth: 2 } as const;

  const groups = [
    {
      label: "Workspace",
      items: [
        { href: dashboardHref, label: "Dashboard", icon: <LayoutDashboard {...iconProps} /> },
        {
          href: `/advisors/${advisor.id}/self-employment`,
          label: "Additional Information",
          icon: <TrendingUp {...iconProps} />,
        },
        { href: `/advisors/${advisor.id}/participants`, label: "Participants", icon: <Users {...iconProps} /> },
        { href: `/advisors/${advisor.id}/referrals`, label: "Referrals", icon: <Mail {...iconProps} /> },
        {
          href: `/advisors/${advisor.id}/notifications`,
          label: "Notifications",
          icon: <Bell {...iconProps} />,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        { href: `/advisors/${advisor.id}/data-sync`, label: "Data Sync", icon: <RefreshCw {...iconProps} /> },
      ],
    },
  ];

  return (
    <SidebarShell
      brandHref={dashboardHref}
      appName={appName}
      logoUrl={logoUrl}
      nav={<SidebarNav groups={groups} />}
      footer={
        <div className="space-y-2">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium text-slate-900">{advisor.full_name}</p>
            <p className="truncate text-xs text-slate-500">
              {advisor.job_title || "Advisor"} · {advisor.office_name}
            </p>
          </div>
          <BackToAdvisorsLink />
        </div>
      }
    >
      {children}
    </SidebarShell>
  );
}
