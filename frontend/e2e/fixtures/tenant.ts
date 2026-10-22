import type { SessionUser } from "./session";

export interface TenantEnv {
  user: SessionUser;
  apiUrl: string;
}

const REQUIRED = [
  "E2E_ORG_ID",
  "E2E_USER_ID",
  "E2E_USER_EMAIL",
  "E2E_SESSION_ID",
  "BACKEND_JWT_SECRET",
] as const;

export function missingTenantEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key]);
}

export function hasTenantEnv(): boolean {
  return missingTenantEnv().length === 0;
}

export function tenantSkipReason(moduleKey: string): string {
  return (
    `Needs a seeded tenant. Unset: ${missingTenantEnv().join(", ") || "(none)"}. ` +
    `Set E2E_ORG_ID, E2E_USER_ID and E2E_USER_EMAIL to an org and an ACTIVE owner ` +
    `membership that exist in the database the backend serves, with an ` +
    `org_modules row enabling "${moduleKey}", E2E_SESSION_ID to an unrevoked ` +
    `user_sessions row of that user (POST /auth/session-exchange refuses a session ` +
    `it has not registered), and BACKEND_JWT_SECRET / INTERNAL_API_SECRET / ` +
    `NEXTAUTH_SECRET byte-matching that backend's.`
  );
}

export const SKIP_REASON = tenantSkipReason("inventory");

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(SKIP_REASON);
  return value;
}

export function tenantEnv(): TenantEnv {
  const missing = missingTenantEnv();
  if (missing.length > 0) throw new Error(SKIP_REASON);

  return {
    user: {
      orgId: requiredEnv("E2E_ORG_ID"),
      userId: requiredEnv("E2E_USER_ID"),
      email: requiredEnv("E2E_USER_EMAIL"),
      sessionId: requiredEnv("E2E_SESSION_ID"),
      isOrgOwner: process.env.E2E_USER_IS_OWNER !== "0",
    },
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500",
  };
}
