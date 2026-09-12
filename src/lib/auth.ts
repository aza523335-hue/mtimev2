import crypto from "crypto";
import type { Settings } from "@prisma/client";

export const ADMIN_COOKIE_NAME = "admin_session";

const getSecret = () => process.env.ADMIN_SESSION_SECRET || "change-me";

export const hashPassword = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const buildSessionToken = (adminPasswordHash: string) =>
  crypto
    .createHmac("sha256", getSecret())
    .update(adminPasswordHash)
    .digest("hex");

export const isAdminAuthenticated = (
  cookieValue: string | undefined,
  settings: Settings | null,
) => {
  if (!cookieValue || !settings) return false;
  return cookieValue === buildSessionToken(settings.adminPasswordHash);
};

export const createAdminCookie = (settings: Settings) =>
  buildSessionToken(settings.adminPasswordHash);

// Reverse proxies may terminate TLS before forwarding HTTP to Next.js.
export const adminCookieOptions = (request: Request) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase() === "https",
  path: "/",
  maxAge: 60 * 60 * 6,
});
