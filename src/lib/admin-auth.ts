import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

// A single shared passcode (not per-user accounts) gates the Administration
// and Reports sections — matches the rest of this app's no-login model while
// keeping org-structure changes and cross-office reporting out of casual
// reach. See README "Security model".
const COOKIE_NAME = "admin_session";
const SESSION_HOURS = 8;

function getSecret(): string | undefined {
  return process.env.ADMIN_PASSCODE;
}

function sign(expiresAt: number, secret: string): string {
  const hmac = createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
  return `${expiresAt}.${hmac}`;
}

function verify(token: string, secret: string): boolean {
  const [expiresAtStr, hmac] = token.split(".");
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || !hmac || Date.now() > expiresAt) return false;

  const expected = createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return !!token && verify(token, secret);
}

export async function grantAdminSession() {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_PASSCODE is not configured.");

  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sign(expiresAt, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function revokeAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
