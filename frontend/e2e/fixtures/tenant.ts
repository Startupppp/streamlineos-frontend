import type { SessionUser } from "./session";

/**
 * Which tenant the authenticated specs run against.
 *
 * Not hardcoded, because these ids are rows in somebody's database and this
 * repo cannot create them — the org, the user, their ACTIVE membership, the
 * `org_modules` row enabling `inventory` and the stock itself all live on the
 * backend side. Supplying them is the environment's job; naming exactly what is
 * missing is this file's.
 */
export interface TenantEnv {
  user: SessionUser;
  apiUrl: string;
}

const REQUIRED = [
  "E2E_ORG_ID",
  "E2E_USER_ID",
  "E2E_USER_EMAIL",
  "BACKEND_JWT_SECRET",
] as const;

/** What is missing, for a skip message that says what to do about it. */
export function missingTenantEnv(): string[] {
  return REQUIRED.filter((key) => !process.env[key]);
}

export function hasTenantEnv(): boolean {
  return missingTenantEnv().length === 0;
}

export const SKIP_REASON =
  `Needs a seeded tenant. Unset: ${missingTenantEnv().join(", ") || "(none)"}. ` +
  `Set E2E_ORG_ID, E2E_USER_ID and E2E_USER_EMAIL to an org and an ACTIVE owner ` +
  `membership that exist in the database the backend serves, with an ` +
  `org_modules row enabling "inventory", and BACKEND_JWT_SECRET / ` +
  `INTERNAL_API_SECRET byte-matching that backend's.`;

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
      isOrgOwner: process.env.E2E_USER_IS_OWNER !== "0",
    },
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1500",
  };
}
