"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADVISOR_COOKIE, isAdvisorName } from "@/lib/constants";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function selectAdvisor(formData: FormData) {
  const name = formData.get("name")?.toString();

  if (!isAdvisorName(name)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADVISOR_COOKIE, name, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  // Without this, Next.js's client-side router cache can keep serving the
  // previous advisor's cached /dashboard and /participants renders after
  // switching, since only the cookie changed and the URL didn't.
  revalidatePath("/", "layout");

  const redirectTo = formData.get("redirectTo")?.toString() || "/dashboard";
  redirect(redirectTo);
}

export async function switchAdvisor() {
  const cookieStore = await cookies();
  cookieStore.delete(ADVISOR_COOKIE);
  revalidatePath("/", "layout");
  redirect("/select-advisor");
}
