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
