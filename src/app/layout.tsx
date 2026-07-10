import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getOrganisationSettings } from "@/lib/data/organisation-settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Organisation Settings are DB-configurable at runtime (see Admin Dashboard
// -> Organisation Settings), so this layout must never be statically
// cached — otherwise a rebrand wouldn't show up until the next deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getOrganisationSettings();
  return {
    title: settings.app_name,
    description: `CRM for advisors managing self-employment caseloads, operated by ${settings.org_name}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getOrganisationSettings();

  // Applied as CSS custom properties rather than rewritten Tailwind classes
  // throughout the app — see README for the exact, deliberately limited
  // scope of what these two colours affect (shared chrome: logo marks,
  // sidebar/header active states, primary buttons on the shell-level
  // screens), not every button in every tab across the CRM.
  const brandStyle = {
    "--brand-primary": settings.primary_color,
    "--brand-secondary": settings.secondary_color,
  } as React.CSSProperties;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={brandStyle}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
