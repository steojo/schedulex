// Single-user session: password in an env var, signed HTTP-only cookie, checked
// in proxy.ts. No auth library — there is exactly one user.
//
// Uses Web Crypto rather than node:crypto so the same code runs in proxy.ts,
// which may execute on the Edge runtime where node built-ins are unavailable.

export const COOKIE = "sx_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function b64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

/** Constant-time string compare — avoids leaking the password via timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD is not set");
  return safeEqual(input, expected);
}

/** Cookie value is `<expiry epoch seconds>.<hmac of that expiry>`. */
export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const expiry = String(Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS);
  return { value: `${expiry}.${await sign(expiry)}`, maxAge: MAX_AGE_SECONDS };
}

export async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const [expiry, sig] = value.split(".");
  if (!expiry || !sig) return false;
  if (!safeEqual(sig, await sign(expiry))) return false;
  return Number(expiry) > Math.floor(Date.now() / 1000);
}
