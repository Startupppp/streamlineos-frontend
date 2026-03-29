/**
 * Tiered, per-bucket rate limiter with progressive penalties.
 *
 * Each "bucket" isolates a category of endpoints so that, for example,
 * burning through login attempts doesn't consume the forgot-password quota.
 *
 * Progressive penalty: when an IP is blocked and keeps hitting the same
 * bucket, the block duration doubles each time (up to a cap).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitTier {
  /** Max requests allowed inside `windowMs` */
  maxRequests: number;
  /** Sliding window in milliseconds */
  windowMs: number;
  /** Enable progressive blocking (doubles block time on repeat violations) */
  progressive?: boolean;
  /** Maximum block duration when progressive is enabled (default 30 min) */
  maxBlockMs?: number;
}

interface BucketEntry {
  /** Timestamps of requests inside the current window (sliding window) */
  timestamps: number[];
  /** If blocked, the time at which the block expires */
  blockedUntil: number;
  /** Current block duration — doubles on each consecutive violation */
  currentBlockMs: number;
}

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  /** Credential login — very strict */
  login: {
    maxRequests: 5,
    windowMs: 60_000,
    progressive: true,
    maxBlockMs: 30 * 60_000, // 30 min max
  },

  /** Auth mutations: forgot-password, reset-password, verify-email, resend-verification */
  "auth-write": {
    maxRequests: 5,
    windowMs: 5 * 60_000, // 5 min
    progressive: true,
    maxBlockMs: 15 * 60_000,
  },

  /** Account creation: org creation, invites, onboarding */
  "account-create": {
    maxRequests: 5,
    windowMs: 5 * 60_000,
  },

  /** AI generation: chat, suggestions — expensive */
  ai: {
    maxRequests: 10,
    windowMs: 60_000,
  },

  /** File uploads */
  upload: {
    maxRequests: 20,
    windowMs: 60_000,
  },

  /** Public (unauthenticated) intake forms */
  "public-intake": {
    maxRequests: 10,
    windowMs: 60_000,
    progressive: true,
    maxBlockMs: 10 * 60_000,
  },

  /** Catch-all for any other /api/ route */
  "api-default": {
    maxRequests: 100,
    windowMs: 60_000,
  },
};

// ---------------------------------------------------------------------------
// Storage (in-process Map — fine for single-instance; swap for Redis later)
// ---------------------------------------------------------------------------

const store = new Map<string, BucketEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    // Remove entries whose window has fully expired AND are not blocked
    const windowEnd = entry.timestamps.length > 0
      ? entry.timestamps[entry.timestamps.length - 1]
      : 0;
    const tier = keyToTier(key);
    const windowMs = tier?.windowMs ?? 60_000;
    if (now - windowEnd > windowMs && now > entry.blockedUntil) {
      store.delete(key);
    }
  }
}

/** Extract tier name from composite key  "tierName:ip" */
function keyToTier(compositeKey: string): RateLimitTier | undefined {
  const tierName = compositeKey.split(":")[0];
  return RATE_LIMIT_TIERS[tierName];
}

// ---------------------------------------------------------------------------
// Core check
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the client should retry (for Retry-After header) */
  retryAfterSecs: number;
}

/**
 * Check whether a request is allowed under the given tier + IP.
 *
 * Call this from middleware; it mutates internal state.
 */
export function checkRateLimit(
  tierName: string,
  ip: string,
): RateLimitResult {
  const tier = RATE_LIMIT_TIERS[tierName];
  if (!tier) return { allowed: true, retryAfterSecs: 0 };

  const now = Date.now();
  cleanup(now);

  const key = `${tierName}:${ip}`;
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [now], blockedUntil: 0, currentBlockMs: 0 };
    store.set(key, entry);
    return { allowed: true, retryAfterSecs: 0 };
  }

  // Currently blocked?
  if (now < entry.blockedUntil) {
    const retryAfterSecs = Math.ceil((entry.blockedUntil - now) / 1000);

    // Progressive: if they keep hitting while blocked, double the duration
    if (tier.progressive) {
      const maxBlock = tier.maxBlockMs ?? 30 * 60_000;
      const nextBlock = Math.min(entry.currentBlockMs * 2, maxBlock);
      entry.currentBlockMs = nextBlock;
      entry.blockedUntil = now + nextBlock;
    }

    return { allowed: false, retryAfterSecs };
  }

  // Sliding window: drop timestamps outside the window
  const windowStart = now - tier.windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= tier.maxRequests) {
    // Rate limit exceeded — block
    const initialBlock = tier.progressive ? tier.windowMs : tier.windowMs;
    const blockMs = entry.currentBlockMs > 0
      ? Math.min(entry.currentBlockMs * 2, tier.maxBlockMs ?? 30 * 60_000)
      : initialBlock;

    if (tier.progressive) {
      entry.currentBlockMs = blockMs;
      entry.blockedUntil = now + blockMs;
    }

    const retryAfterSecs = Math.ceil(blockMs / 1000);
    return { allowed: false, retryAfterSecs };
  }

  // Allowed — record the request
  entry.timestamps.push(now);

  // Reset progressive penalty on successful (non-blocked) request
  if (entry.currentBlockMs > 0 && entry.timestamps.length <= tier.maxRequests / 2) {
    entry.currentBlockMs = 0;
  }

  return { allowed: true, retryAfterSecs: 0 };
}

// ---------------------------------------------------------------------------
// Route → Tier resolver
// ---------------------------------------------------------------------------

interface RouteRule {
  prefix: string;
  tier: string;
}

/**
 * Ordered list — first match wins.  More specific prefixes come first.
 */
const ROUTE_RULES: RouteRule[] = [
  // Login specifically (NextAuth credentials callback)
  { prefix: "/api/auth/callback/credentials", tier: "login" },

  // Auth write mutations via tRPC
  { prefix: "/api/trpc/auth.forgotPassword", tier: "auth-write" },
  { prefix: "/api/trpc/auth.resetPassword", tier: "auth-write" },
  { prefix: "/api/trpc/auth.verifyEmail", tier: "auth-write" },
  { prefix: "/api/trpc/auth.acceptInvitation", tier: "auth-write" },
  { prefix: "/api/trpc/auth.resendVerificationEmail", tier: "auth-write" },

  // Account creation endpoints
  { prefix: "/api/trpc/organization.createOrganization", tier: "account-create" },
  { prefix: "/api/trpc/organization.inviteUser", tier: "account-create" },
  { prefix: "/api/trpc/hr.employee.onboardEmployee", tier: "account-create" },

  // AI / Chat
  { prefix: "/api/chat", tier: "ai" },
  { prefix: "/api/ai/", tier: "ai" },

  // File uploads
  { prefix: "/api/storage/upload", tier: "upload" },
  { prefix: "/api/expenses/import", tier: "upload" },

  // Public (unauthenticated) intake
  { prefix: "/api/public/", tier: "public-intake" },

  // Remaining auth routes (session reads are excluded in middleware)
  { prefix: "/api/auth/", tier: "auth-write" },
];

/**
 * Given a request pathname, return the rate-limit tier name.
 * Returns `null` for paths that should skip rate limiting entirely
 * (e.g. `/api/auth/session`).
 */
export function resolveTier(pathname: string): string | null {
  // Session reads are high-frequency and read-only — skip
  if (pathname === "/api/auth/session") return null;

  // Non-API routes are not rate-limited at this layer
  if (!pathname.startsWith("/api/")) return null;

  for (const rule of ROUTE_RULES) {
    if (pathname.startsWith(rule.prefix)) return rule.tier;
  }

  // Fallback: all other API routes
  return "api-default";
}

// ---------------------------------------------------------------------------
// Bot detection
// ---------------------------------------------------------------------------

const BOT_UA_PATTERNS = [
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /wget/i,
  /curl/i,
  /httpie/i,
  /postmanruntime/i,
  /insomnia/i,
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /masscan/i,
  /dirbuster/i,
  /gobuster/i,
  /nuclei/i,
  /zgrab/i,
  /censys/i,
  /shodan/i,
  /semrush/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /headlesschrome/i,
  /phantomjs/i,
];

/**
 * Returns true if the User-Agent looks like an automated tool / scraper.
 * Only block these on sensitive endpoints — not on public intake forms
 * (which may legitimately come from integrations).
 */
export function isSuspiciousBot(userAgent: string | null): boolean {
  if (!userAgent || userAgent.trim().length === 0) return true;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
