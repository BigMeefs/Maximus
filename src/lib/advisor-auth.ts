import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";

// Advisor PIN authentication — gates /advisors/[advisorId]/* behind a
// 4-digit PIN unique to that advisor, on top of this app's existing
// no-login "pick your name" model (see README "Security model"). Mirrors
// the shape of src/lib/admin-auth.ts (signed, httpOnly, expiring cookie)
// but the session token is scoped to one specific advisor id, so it can
// never be reused to access a different advisor's workspace.
const COOKIE_NAME = "advisor_session";
const SESSION_HOURS = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function getSecret(): string | undefined {
  return process.env.ADVISOR_SESSION_SECRET;
}

function sign(advisorId: string, expiresAt: number, secret: string): string {
  const payload = `${advisorId}.${expiresAt}`;
  const hmac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

function verify(token: string, advisorId: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [tokenAdvisorId, expiresAtStr, hmac] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || !hmac || Date.now() > expiresAt) return false;
  if (tokenAdvisorId !== advisorId) return false;

  const expected = createHmac("sha256", secret).update(`${tokenAdvisorId}.${expiresAtStr}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdvisorAuthenticated(advisorId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const secret = getSecret();
  if (!secret) return false;

  const token = cookieStore.get(COOKIE_NAME)?.value;
  return !!token && verify(token, advisorId, secret);
}

export async function grantAdvisorSession(advisorId: string) {
  const secret = getSecret();
  if (!secret) throw new Error("ADVISOR_SESSION_SECRET is not configured.");

  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sign(advisorId, expiresAt, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function revokeAdvisorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// PIN hashing — scrypt (Node's built-in crypto, already used by
// admin-auth.ts, so no new dependency), salted per advisor. The raw PIN is
// never persisted, logged, or returned from any function here.
// ---------------------------------------------------------------------------
function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, 64).toString("hex");
}

export function hashNewPin(pin: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  return { hash: hashPin(pin, salt), salt };
}

export type PinCheckResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "locked" | "incorrect" };

// Verifies a PIN against the stored hash and enforces a simple per-advisor
// lockout: MAX_FAILED_ATTEMPTS wrong guesses in a row locks that advisor
// out for LOCKOUT_MINUTES. A lock that has already expired is treated as a
// clean slate rather than compounding into an instant re-lock.
export async function verifyAdvisorPin(advisorId: string, pin: string): Promise<PinCheckResult> {
  const supabase = await createClient();
  const { data: cred } = await supabase
    .from("advisor_pin_credentials")
    .select("advisor_id, pin_hash, pin_salt, failed_attempts, locked_until")
    .eq("advisor_id", advisorId)
    .maybeSingle();

  if (!cred) return { ok: false, reason: "not_configured" };

  const lockExpired = !!cred.locked_until && new Date(cred.locked_until) <= new Date();
  if (cred.locked_until && !lockExpired) {
    return { ok: false, reason: "locked" };
  }

  const attemptsBase = lockExpired ? 0 : cred.failed_attempts;
  const candidateHash = hashPin(pin, cred.pin_salt);
  let matches: boolean;
  try {
    matches = timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(cred.pin_hash, "hex"));
  } catch {
    matches = false;
  }

  if (!matches) {
    const attempts = attemptsBase + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString() : null;
    await supabase
      .from("advisor_pin_credentials")
      .update({ failed_attempts: attempts, locked_until: lockedUntil })
      .eq("advisor_id", advisorId);
    return { ok: false, reason: lockedUntil ? "locked" : "incorrect" };
  }

  if (attemptsBase > 0 || cred.locked_until) {
    await supabase
      .from("advisor_pin_credentials")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("advisor_id", advisorId);
  }

  return { ok: true };
}
