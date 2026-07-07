"use server";

import { redirect } from "next/navigation";
import { grantAdminSession, revokeAdminSession, safeEqual } from "@/lib/admin-auth";

export type AdminLoginFormState = {
  error?: string;
};

export async function loginAdmin(
  redirectTo: string,
  _prevState: AdminLoginFormState,
  formData: FormData,
): Promise<AdminLoginFormState> {
  const passcode = formData.get("passcode")?.toString() ?? "";
  const expected = process.env.ADMIN_PASSCODE;

  if (!expected) {
    return { error: "Admin access isn't configured yet — set ADMIN_PASSCODE in the environment." };
  }
  if (!passcode || !safeEqual(passcode, expected)) {
    return { error: "Incorrect passcode." };
  }

  await grantAdminSession();
  redirect(redirectTo);
}

export async function logoutAdmin(redirectTo: string) {
  await revokeAdminSession();
  redirect(redirectTo);
}
