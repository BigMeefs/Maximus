"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { hashNewPin } from "@/lib/advisor-auth";

export type AdvisorPinManageState = {
  error?: string;
  success?: string;
};

// Covers both "Set" (no row yet) and "Change" (row exists) — an upsert on
// the same advisor_id primary key naturally handles either case with one
// action, and always clears any lockout since a freshly-set PIN supersedes
// whatever the advisor was previously locked out of.
export async function setAdvisorPin(
  advisorId: string,
  _prevState: AdvisorPinManageState,
  formData: FormData,
): Promise<AdvisorPinManageState> {
  if (!(await isAdminAuthenticated())) {
    return { error: "Not authorized." };
  }

  const pin = formData.get("pin")?.toString() ?? "";
  if (!/^\d{4}$/.test(pin)) {
    return { error: "PIN must be exactly 4 digits." };
  }

  const { hash, salt } = hashNewPin(pin);
  const supabase = await createClient();
  const { error } = await supabase.from("advisor_pin_credentials").upsert(
    {
      advisor_id: advisorId,
      pin_hash: hash,
      pin_salt: salt,
      failed_attempts: 0,
      locked_until: null,
      updated_by: "Admin",
    },
    { onConflict: "advisor_id" },
  );

  if (error) {
    return { error: "Could not save the PIN. Please try again." };
  }

  revalidatePath(`/admin/advisors/${advisorId}`);
  return { success: "PIN saved." };
}

// Clears a lockout without changing the advisor's actual PIN — for the
// "advisor locked themselves out, let them straight back in" case.
export async function unlockAdvisorPin(advisorId: string) {
  if (!(await isAdminAuthenticated())) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("advisor_pin_credentials")
    .update({ failed_attempts: 0, locked_until: null, updated_by: "Admin" })
    .eq("advisor_id", advisorId);

  revalidatePath(`/admin/advisors/${advisorId}`);
}
