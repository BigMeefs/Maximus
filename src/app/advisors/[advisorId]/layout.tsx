import { getAdvisorOrNotFound } from "@/lib/data/advisor";
import AppShell from "@/components/app-shell";

export default async function AdvisorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ advisorId: string }>;
}) {
  const { advisorId } = await params;
  const advisor = await getAdvisorOrNotFound(advisorId);

  return <AppShell advisor={advisor}>{children}</AppShell>;
}
