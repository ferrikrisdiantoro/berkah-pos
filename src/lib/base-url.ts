import { headers } from "next/headers";

/**
 * URL dasar aplikasi, diambil dari header request (works di localhost, Vercel,
 * maupun domain custom tanpa konfigurasi). Fallback ke NEXT_PUBLIC_APP_URL lalu
 * localhost bila header tak tersedia.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
