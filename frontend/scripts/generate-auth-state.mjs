/**
 * generate-auth-state.mjs
 * Programmatically creates a valid NextAuth v5 session cookie
 * and writes it to scripts/.auth/state.json without hitting the
 * rate-limited /auth/login endpoint.
 *
 * Usage: node scripts/generate-auth-state.mjs
 */

import { encode } from "next-auth/jwt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = path.join(__dirname, ".auth", "state.json");

const SECRET = "KqOqLbrEpNyNKVbwEZ0ZYH7MxlXkpu6Pz5mU5/ADd5rQYP+Q4Lnp/M633k8/50Mv";
const COOKIE_NAME = "authjs.session-token";

const now = Math.floor(Date.now() / 1000);
const maxAge = 30 * 24 * 60 * 60;

const token = {
  sub: "demo-user-id",
  id: "demo-user-id",
  email: "demo@streamlineos.in",
  name: "Demo User",
  image: null,
  role: "ADMIN",
  forceChangePassword: false,
  isActive: true,
  hasDashboardAccess: true,
  orgId: "demo-org-id",
  isOrgOwner: true,
  orgOnboardingCompletedAt: new Date().toISOString(),
  branchId: null,
  totpEnabled: false,
  mfaEnforced: false,
  permissions: [],
  plan: "PROFESSIONAL",
  enabledModules: ["hr", "crm", "projects", "accounting", "kb", "blog", "support"],
  userOnboardingCompletedAt: new Date().toISOString(),
  isPlatformAdmin: false,
  sessionId: randomUUID(),
  authProvider: "credentials",
  iat: now,
  exp: now + maxAge,
  jti: randomUUID(),
};

const encoded = await encode({
  token,
  secret: SECRET,
  maxAge,
  salt: COOKIE_NAME,
});

const state = {
  cookies: [
    {
      name: COOKIE_NAME,
      value: encoded,
      domain: "localhost",
      path: "/",
      expires: now + maxAge,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ],
  origins: [],
};

const authDir = path.dirname(AUTH_STATE_PATH);
fs.mkdirSync(authDir, { recursive: true });
fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
console.log("Auth state written to", AUTH_STATE_PATH);
console.log("Cookie name:", COOKIE_NAME);
console.log("Expires:", new Date((now + maxAge) * 1000).toISOString());
