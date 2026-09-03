/**
 * Drives the REAL RateLimitGuard + RateLimitService (imported from the backend
 * source, not re-implemented) to measure whether a per-IP tier can be bypassed
 * by rotating the X-Forwarded-For header.
 *
 * Run from the backend repo root:
 *   NODE_ENV=production node -r ts-node/register/transpile-only \
 *     <this file>
 *
 * NODE_ENV=production is required: DEV_LIMIT_MULTIPLIER in rate-limit.service.ts
 * multiplies every tier by 10 outside production, so a probe run in development
 * would measure a limit ten times the deployed one.
 */
// The probe lives outside the backend tree, so the real modules are required by
// absolute path. BACKEND_ROOT defaults to the current working directory, which is
// how the command below invokes it.
const BACKEND_ROOT = process.env.BACKEND_ROOT ?? process.cwd();
/* eslint-disable @typescript-eslint/no-require-imports */
const { RateLimitGuard } = require(`${BACKEND_ROOT}/src/common/ratelimit/rate-limit.guard`);
const { RateLimitService } = require(`${BACKEND_ROOT}/src/common/ratelimit/rate-limit.service`);
const { RATE_LIMIT_TIER } = require(`${BACKEND_ROOT}/src/common/ratelimit/use-rate-limit.decorator`);
console.log(`# real modules loaded from ${BACKEND_ROOT}/src/common/ratelimit/`);

const TIER = "auth:login"; // 5 requests / 60s, the tightest unauthenticated tier

// A Reflector stand-in that reports the tier the decorator would set.
const reflector = { getAllAndOverride: () => TIER } as never;
const service = new RateLimitService(null); // no Redis -> in-memory window
const guard = new RateLimitGuard(reflector, service);

function contextFor(forwardedFor: string | undefined) {
  const res = { setHeader: () => undefined };
  const req = {
    headers: forwardedFor === undefined ? {} : { "x-forwarded-for": forwardedFor },
    ip: "203.0.113.9", // the real socket peer, identical for every request
    user: undefined, // unauthenticated: the guard falls back to the IP
  };
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as never;
}

async function attempt(forwardedFor: string | undefined): Promise<"allowed" | "429"> {
  try {
    await guard.canActivate(contextFor(forwardedFor));
    return "allowed";
  } catch {
    return "429";
  }
}

async function main(): Promise<void> {
  console.log(`NODE_ENV=${process.env.NODE_ENV}`);
  console.log(`tier=${TIER}  RATE_LIMIT_TIER key=${String(RATE_LIMIT_TIER)}`);

  // Control: one honest client, same forwarded IP every time.
  let allowedFixed = 0;
  for (let i = 0; i < 50; i++)
    if ((await attempt("198.51.100.7")) === "allowed") allowedFixed++;
  console.log(`\nCONTROL  — 50 requests, X-Forwarded-For fixed at 198.51.100.7`);
  console.log(`           allowed: ${allowedFixed} / 50   (throttled after the tier limit)`);

  // Attack: the same socket peer, a different forwarded IP per request.
  let allowedRotating = 0;
  for (let i = 0; i < 50; i++)
    if ((await attempt(`198.51.100.${i % 254}`)) === "allowed") allowedRotating++;
  console.log(`\nBYPASS   — 50 requests, same socket peer, X-Forwarded-For rotated per request`);
  console.log(`           allowed: ${allowedRotating} / 50`);

  // Control 2: header absent entirely -> falls back to req.ip, which is honest.
  let allowedNoHeader = 0;
  for (let i = 0; i < 50; i++) if ((await attempt(undefined)) === "allowed") allowedNoHeader++;
  console.log(`\nCONTROL  — 50 requests, no X-Forwarded-For at all (falls back to req.ip)`);
  console.log(`           allowed: ${allowedNoHeader} / 50`);

  const bypassed = allowedRotating > allowedFixed;
  console.log(
    `\nVERDICT: ${bypassed ? "BYPASSED" : "not bypassed"} — rotating the header let ` +
      `${allowedRotating - allowedFixed} extra request(s) through that the fixed-IP client could not send.`,
  );
  process.exit(bypassed ? 1 : 0);
}

void main();
