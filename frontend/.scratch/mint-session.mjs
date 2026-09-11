import { hkdf } from "node:crypto";
import { promisify } from "node:util";
import { EncryptJWT } from "jose";

const hkdfAsync = promisify(hkdf);
const secret = process.env.NEXTAUTH_SECRET;
if (!secret) { console.error("NEXTAUTH_SECRET required"); process.exit(2); }

const info = "Auth.js Generated Encryption Key (authjs.session-token)";
const key = new Uint8Array(await hkdfAsync("sha256", secret, "authjs.session-token", info, 64));

const now = Math.floor(Date.now() / 1000);
const token = {
  id: process.env.SEED_USER_ID,
  sub: process.env.SEED_USER_ID,
  email: process.env.SEED_EMAIL,
  name: "Buildmart Owner",
  role: "OWNER",
  orgId: process.env.SEED_ORG_ID,
  isOrgOwner: true,
  organizationAccess: "active",
  sessionId: process.env.SEED_SESSION_ID,
  userOnboardingCompletedAt: new Date().toISOString(),
  orgOnboardingCompletedAt: new Date().toISOString(),
  iat: now,
  exp: now + 12 * 3600,
  jti: process.env.SEED_SESSION_ID,
};

const jwe = await new EncryptJWT(token)
  .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
  .setIssuedAt(now)
  .setExpirationTime(now + 12 * 3600)
  .encrypt(key);
process.stdout.write(jwe);
