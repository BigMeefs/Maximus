import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADVISOR_COOKIE, isAdvisorName, type AdvisorName } from "@/lib/constants";

export async function getCurrentAdvisor(): Promise<{ name: AdvisorName }> {
  const cookieStore = await cookies();
  const name = cookieStore.get(ADVISOR_COOKIE)?.value;

  if (!isAdvisorName(name)) {
    redirect("/select-advisor");
  }

  return { name };
}
