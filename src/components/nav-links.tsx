"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function NavLinks({ advisorId }: { advisorId: string }) {
  const pathname = usePathname();

  const workspaceLinks = [
    { href: `/advisors/${advisorId}/dashboard`, label: "Dashboard", icon: "▦" },
    { href: `/advisors/${advisorId}/participants`, label: "Participants", icon: "▤" },
    { href: `/advisors/${advisorId}/data-sync`, label: "Data Sync", icon: "⇅" },
  ];

  const companyLinks = [
    { href: "/reports", label: "Reports", icon: "📊" },
    { href: "/admin", label: "Administration", icon: "⚙" },
  ];

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {workspaceLinks.map((link) => (
        <NavLink key={link.href} link={link} pathname={pathname} />
      ))}
      <div className="my-2 border-t border-slate-100" />
      {companyLinks.map((link) => (
        <NavLink key={link.href} link={link} pathname={pathname} />
      ))}
    </nav>
  );
}

function NavLink({
  link,
  pathname,
}: {
  link: { href: string; label: string; icon: string };
  pathname: string;
}) {
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
  return (
    <Link
      href={link.href}
      className={clsx(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <span aria-hidden className="text-base">
        {link.icon}
      </span>
      {link.label}
    </Link>
  );
}
