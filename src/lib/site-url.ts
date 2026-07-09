import { headers } from "next/headers";

// Absolute origin for links that need to work outside the app itself (QR
// codes, anything printed/emailed) — derived from the incoming request
// rather than an env var, since this app has no such var configured today.
export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
