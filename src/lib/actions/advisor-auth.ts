"use server";

import { redirect } from "next/navigation";
import { grantAdvisorSession, revokeAdvisorSession, verifyAdvisorPin } from "@/lib/advisor-auth";

export type AdvisorPinFormState = {
  error?: string;
};

export async function loginAdvisor(
  advisorId: string,
  redirectTo: string,
  _prevState: AdvisorPinFormState,
  formData: FormData,
): Promise<AdvisorPinFormState> {
  if (!process.env.ADVISOR_SESSION_SECRET) {
    return { error: "Advisor sign-in isn't configured yet — set ADVISOR_SESSION_SECRET in the environment." };
  }

  const pin = formData.get("pin")?.toString() ?? "";
  if (!/^\d{4}$/.test(pin)) {
    return { error: "Enter a 4-digit passcode." };
  }

  const result = await verifyAdvisorPin(advisorId, pin);

  if (!result.ok) {
    if (result.reason === "not_configured") {
      return { error: "No passcode has been set for this advisor yet. Contact an administrator." };
    }
    if (result.reason === "locked") {
      return { error: "Too many incorrect attempts. Try again in a few minutes." };
    }
    return { error: "Incorrect passcode. Please try again." };
  }

  await grantAdvisorSession(advisorId);
  redirect(redirectTo);
}

export async function logoutAdvisor(redirectTo: string) {
  await revokeAdvisorSession();
  redirect(redirectTo);
}
