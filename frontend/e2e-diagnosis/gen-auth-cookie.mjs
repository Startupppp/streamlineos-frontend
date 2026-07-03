/**
 * Generate a valid Auth.js v5 session cookie (JWE) for direct injection.
 * Replicates @auth/core encode() exactly.
 */
import { hkdf } from '../node_modules/.pnpm/@panva+hkdf@1.2.1/node_modules/@panva/hkdf/dist/node/esm/index.js';
import postgres from '../../backend/node_modules/postgres/src/index.js';

// Dynamically import jose from ESM entry
const { EncryptJWT, base64url, calculateJwkThumbprint } = await import('../node_modules/jose/dist/node/esm/index.js');

const DB_URL = 'postgresql://neondb_owner:npg_YG63HNcxTwIf@ep-old-darkness-aocaim3k-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const SECRET = 'KqOqLbrEpNyNKVbwEZ0ZYH7MxlXkpu6Pz5mU5/ADd5rQYP+Q4Lnp/M633k8/50Mv';
const COOKIE_NAME = 'authjs.session-token';
const USER_ID = 'a723ac2d-0b0a-4f24-a3ae-f4605af20bbb';
const BACKEND_URL = 'http://localhost:1500';

async function getDerivedKey(secret, salt) {
  // Exactly matches @auth/core getDerivedEncryptionKey for A256CBC-HS512 (length=64)
  return hkdf('sha256', secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

async function encodeSessionJWT(payload, secret, salt) {
  const enc = 'A256CBC-HS512';
  const alg = 'dir';
  const encKey = await getDerivedKey(secret, salt);
  const thumbprint = await calculateJwkThumbprint(
    { kty: 'oct', k: base64url.encode(encKey) },
    'sha512'
  );
  const now = Math.floor(Date.now() / 1000);
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg, enc, kid: thumbprint })
    .setIssuedAt(now)
    .setExpirationTime(now + 30 * 24 * 60 * 60)
    .setJti(crypto.randomUUID())
    .encrypt(encKey);
}

async function main() {
  const sql = postgres(DB_URL, { ssl: 'require', max: 1 });
  try {
    const orgRows = await sql`
      SELECT o.id as org_id
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${USER_ID}
      LIMIT 1
    `;
    const userRows = await sql`SELECT email, first_name, last_name FROM users WHERE id = ${USER_ID}`;
    const user = userRows[0];
    const orgId = orgRows[0]?.org_id ?? null;
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;

    // Use backend session-data endpoint (not rate-limited)
    let sessionData = null;
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/session-data/${USER_ID}`);
      if (resp.ok) {
        const raw = await resp.json();
        sessionData = raw?.data ?? raw;
        console.error('Got session data from backend, orgId:', sessionData?.orgId, 'isOrgOwner:', sessionData?.isOrgOwner);
      }
    } catch (e) {
      console.error('Session-data error:', e.message);
    }

    const payload = {
      id: USER_ID,
      email: user.email,
      name,
      role: sessionData?.role ?? null,
      image: null,
      forceChangePassword: false,
      isActive: true,
      hasDashboardAccess: true,
      orgId: sessionData?.orgId ?? orgId,
      isOrgOwner: sessionData?.isOrgOwner ?? true,
      orgOnboardingCompletedAt: sessionData?.orgOnboardingCompletedAt ?? null,
      userOnboardingCompletedAt: sessionData?.userOnboardingCompletedAt ?? null,
      branchId: null,
      totpEnabled: false,
      mfaEnforced: false,
      permissions: sessionData?.permissions ?? [],
      plan: sessionData?.plan ?? null,
      enabledModules: sessionData?.enabledModules ?? ['kb', 'hr', 'crm', 'projects'],
      isPlatformAdmin: false,
      sessionId: crypto.randomUUID(),
      authProvider: 'credentials',
      sub: USER_ID,
    };

    console.error('Payload (partial):', JSON.stringify({ orgId: payload.orgId, isOrgOwner: payload.isOrgOwner, enabledModules: payload.enabledModules }));

    const jwe = await encodeSessionJWT(payload, SECRET, COOKIE_NAME);
    // Output just the token on stdout
    console.log(jwe);
  } finally {
    await sql.end();
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
