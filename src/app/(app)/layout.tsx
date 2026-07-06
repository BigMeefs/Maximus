import { getCurrentAdvisor } from "@/lib/current-advisor";
import AppShell from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const advisor = await getCurrentAdvisor();

  return <AppShell advisorName={advisor.fullName}>{children}</AppShell>;
}
