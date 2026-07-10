"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function NavLinks({
  advisorId,
  unreadCount = 0,
}: {
  advisorId: string;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  const workspaceLinks = [
    { href: `/advisors/${advisorId}/dashboard`, label: "Dashboard", icon: "▦" },
    { href: `/advisors/${advisorId}/self-employment`, label: "Self Employment", icon: "📈" },
    { href: `/advisors/${advisorId}/participants`, label: "Participants", icon: "▤" },
    {
      href: `/advisors/${advisorId}/notifications`,
      label: "Notifications",
      icon: "🔔",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { href: `/advisors/${advisorId}/data-sync`, label: "Data Sync", icon: "⇅" },
  ];

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {workspaceLinks.map((link) => (
        <NavLink key={link.href} link={link} pathname={pathname} />
      ))}
    </nav>
  );
}

function NavLink({
  link,
  pathname,
}: {
  link: { href: string; label: string; icon: string; badge?: number };
  pathname: string;
}) {
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
  return (
    <Link
      href={link.href}
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--brand-primary)] text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <span aria-hidden className="text-base">
        {link.icon}
      </span>
      <span className="flex-1">{link.label}</span>
      {link.badge !== undefined && (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            active ? "bg-white/20 text-white" : "bg-red-100 text-red-700",
          )}
        >
          {link.badge}
        </span>
      )}
    </Link>
  );
}
