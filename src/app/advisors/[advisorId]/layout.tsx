import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import { getUnreviewedCountForAdvisor } from "@/lib/data/notifications";
import AppShell from "@/components/app-shell";

export default async function AdvisorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const [advisor, unreadCount] = await Promise.all([
    getAdvisorOrNotFound(advisorId),
    getUnreviewedCountForAdvisor(advisorId),
  ]);

  return (
    <AppShell advisor={advisor} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
