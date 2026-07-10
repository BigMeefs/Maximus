"use server";

import { cookies } from "next/headers";

// Lightweight proxy for "since you last logged in" in an app that has no
// login system (see README "Security model") — a per-advisor cookie
// recording when their dashboard was last rendered. Read the OLD value
// server-side to filter "what's new since then", then call this to bump it
// to now for next time. This is not a session and grants no access; it's
// purely a timestamp so the dashboard can say "since you were last here."
const COOKIE_PREFIX = "last_visit_";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function touchLastVisit(advisorId: string) {
  const cookieStore = await cookies();
  cookieStore.set(`${COOKIE_PREFIX}${advisorId}`, new Date().toISOString(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}
