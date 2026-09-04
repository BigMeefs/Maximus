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

  const groups = [
    {
      label: "Workspace",
      items: [
        { href: dashboardHref, label: "Dashboard" },
        { href: `/advisors/${advisor.id}/self-employment`, label: "Additional Information" },
        { href: `/advisors/${advisor.id}/participants`, label: "Participants" },
        { href: `/advisors/${advisor.id}/referrals`, label: "Referrals" },
        {
          href: `/advisors/${advisor.id}/notifications`,
          label: "Notifications",
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
        { href: `/advisors/${advisor.id}/data-sync`, label: "Data Sync" },
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
