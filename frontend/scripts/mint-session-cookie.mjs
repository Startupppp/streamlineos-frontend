#!/usr/bin/env node
/**
 * mint-session-cookie — produce the `authjs.session-token` value that
 * `measure-web-vitals` and `browser-journeys` require.
 *
 * Both drivers refuse an unauthenticated run, because the budgets they check
 * govern authenticated routes. There was no way to obtain that cookie without
 * a browser and a password, so the authenticated capture had never been taken.
 *
 * The identity is supplied on the command line, never read from a database —
 * this repo's frontend has no database access. The session callback in
 * `lib/auth.ts` re-fetches role, org, plan and enabled modules from the backend
 * by `token.id`, so a minted token carries only identity and is filled in by
 * the running app exactly as a password login would be.
 *
 *   node --env-file=.env scripts/mint-session-cookie.mjs \
 *     --user-id=<uuid> --email=<address> --out=.session-cookie
 *   node scripts/mint-session-cookie.mjs --self-test
 */

import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { encode, decode } from "next-auth/jwt";

const COOKIE_NAME = "authjs.session-token";
const MAX_AGE = 60 * 60 * 24;

const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const mint = async ({ userId, email, secret, sessionId }) => {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    token: {
      id: userId,
      sub: userId,
      email,
      name: null,
      isActive: true,
      sessionId: sessionId ?? randomUUID(),
      authProvider: "credentials",
      iat: now,
      exp: now + MAX_AGE,
      jti: randomUUID(),
    },
    secret,
    salt: COOKIE_NAME,
    maxAge: MAX_AGE,
  });
};

const selfTest = async () => {
  const secret = "self-test-secret-self-test-secret-0123456789";
  const userId = randomUUID();
  const value = await mint({ userId, email: "probe@example.test", secret });
  const round = await decode({ token: value, secret, salt: COOKIE_NAME });
  const failures = [];
  if (round?.id !== userId) failures.push("round-trip lost the user id");
  if (round?.email !== "probe@example.test") failures.push("round-trip lost the email");
  if (!round?.sessionId) failures.push("round-trip lost the session id");
  const wrong = await decode({ token: value, secret: `${secret}x`, salt: COOKIE_NAME })
    .then(() => "decoded under the wrong secret")
    .catch(() => null);
  if (wrong) failures.push(wrong);
  const wrongSalt = await decode({ token: value, secret, salt: "other-cookie" })
    .then(() => "decoded under the wrong salt")
    .catch(() => null);
  if (wrongSalt) failures.push(wrongSalt);
  if (failures.length) {
    for (const f of failures) console.error(`FAIL ${f}`);
    process.exit(1);
  }
  console.log("mint-session-cookie self-test: 4 checks passed");
};

const main = async () => {
  if (argv.includes("--self-test")) return selfTest();
  const userId = flag("user-id");
  const email = flag("email");
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!userId || !email) {
    console.error("--user-id and --email are required");
    process.exit(1);
  }
  if (!secret) {
    console.error("NEXTAUTH_SECRET (or AUTH_SECRET) is required — run with --env-file=.env");
    process.exit(1);
  }
  const value = await mint({ userId, email, secret });
  const out = flag("out");
  if (out) {
    writeFileSync(out, value);
    console.log(`wrote ${COOKIE_NAME} for ${email} to ${out} (${value.length} bytes)`);
    return;
  }
  process.stdout.write(value);
};

await main();
