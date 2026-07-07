import { notFound } from "next/navigation";
import { isAdvisorName } from "@/lib/constants";
import AppShell from "@/components/app-shell";

export default async function AdvisorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ advisor: string }>;
}) {
  const { advisor } = await params;

  if (!isAdvisorName(advisor)) {
    notFound();
  }

  return <AppShell advisorName={advisor}>{children}</AppShell>;
}
