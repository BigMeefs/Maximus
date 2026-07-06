"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ADVISOR_NAMES } from "@/lib/constants";

export type LoginState = {
  error?: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const advisor = formData.get("advisor")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirectTo = formData.get("redirectTo")?.toString() || "/dashboard";

  if (!ADVISOR_NAMES.includes(advisor as (typeof ADVISOR_NAMES)[number])) {
    return { error: "Select an advisor account." };
  }

  if (!password) {
    return { error: "Enter your password." };
  }

  const supabase = await createClient();
  const email = `${advisor.toLowerCase()}@caseload.local`;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Incorrect password. Please try again." };
  }

  redirect(redirectTo);
}
