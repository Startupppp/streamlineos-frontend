# Ticket 32 — edge security (PRD-C163, PRD-C164)

Captured 2026-09-03T16:31:15Z on a developer laptop. **No deployed environment exists on this
machine.** Nothing in this directory is deployed proof, and nothing here has been submitted to
`ops:evidence:capture` — that gate refuses local results by design, and correctly so.

| | |
|---|---|
| Frontend | `release/code-10-10-v2` @ `7469d27895add587f9427e7c50c457f56e0048bf` |
| Backend | `release/code-10-10-v2` @ `45f8a2e99494483526e357e27f18c76961ebf266` |
| Node | v25.9.0 |
| Backend edge deps | `express@5.2.1`, `helmet@8.2.0`, `cors@2.8.6` |
| Frontend | `next@16.3.0` |

The criteria under test:

- **PRD-C163** — "Verify **deployed** TLS, encryption at rest, infrastructure secret isolation and
  credential/key rotation."
- **PRD-C164** — "Verify **deployed** edge WAF/rate limits, CORS, CSP, headers, request limits and
  malicious traffic behavior."

Both say *deployed*. Neither can be closed here. What *can* be settled here is the half that is
configured in code, and that half is settled below — including eight defects, seven of them
demonstrated by measurement rather than by reading.

---

## Verdict summary

### Defects found (all reproducible on this machine)

| # | Severity | What | Where |
|---|---|---|---|
| D1 | **High** | Every IP-keyed rate limit is bypassable by rotating `X-Forwarded-For`. Measured: `auth:login` (5/60s) → **49 of 50** requests allowed. | `src/common/ratelimit/rate-limit.guard.ts:8-13` |
| D2 | **High** | The delivered CSP blocks Ably realtime. `connect-src` lists no `wss:` scheme and no Ably host; chat and the support inbox both open `Ably.Realtime`. | `frontend/proxy.ts:33-44` vs `frontend/lib/ably.ts:20,32` |
| D3 | **Medium** | Two independent CSPs exist and govern disjoint paths. The `next.config.ts` policy never reaches a document — the middleware overwrites it — yet a test treats both as "live policies". | `frontend/next.config.ts:199-202`, `frontend/proxy.ts:236-239` |
| D4 | **Medium** | `wss://` is not a valid CSP source expression. Browsers drop the token; the directive that was meant to permit websockets never did. | `frontend/next.config.ts:55` |
| D5 | **Medium** | Bot verification fails **open**. With `TURNSTILE_SECRET_KEY` unset — and it is not required in production — every public form accepts unverified submissions silently. | `src/common/security/turnstile.service.ts:27-28` |
| D6 | **Medium** | `CALENDAR_PROVIDER_WEBHOOK_SECRET` is a shared secret read at runtime but never validated at boot. `env-coverage.spec.ts` is **red** on this branch and runs in CI. | `src/modules/calendar/calendar-webhook-secret.ts:12` |
| D7 | **Low** | Frontend leaks `X-Powered-By: Next.js`; `poweredByHeader: false` is not set. The backend strips it via helmet — the two halves disagree. | `frontend/next.config.ts:98-206` |
| D8 | **Low** | The frontend has **no dependency-vulnerability gate**. 3 production HIGH advisories are ungated, incl. `pdfjs-dist` arbitrary JS execution. The backend gate exists and is green. | `.github/workflows/frontend.yml` |

### Verified in code (no deployed endpoint needed)

CORS allowlisting and ordering, request-size limits, backend security headers, field-level
envelope encryption with key rotation, hash-at-rest for inbound support secrets, deny-by-default
rate-limit tiers, no committed credentials, no plaintext secret logging.

### Genuinely blocked

Deployed TLS/HSTS delivery, edge WAF, encryption at rest at the storage layer, infrastructure
secret isolation, credential rotation practice, and observed malicious-traffic behaviour at the
edge. **No WAF configuration of any kind exists in either repository** — not Terraform, not
`wrangler.toml`, not a `firewall`/`headers` block in `vercel.json`. So the deployed half is not
merely unverified; its intent is not declared anywhere in the tree either.

---

## D1 — X-Forwarded-For defeats every IP-keyed rate limit

`RateLimitGuard` keys an unauthenticated request on the client's own `X-Forwarded-For` header:

```ts
// src/common/ratelimit/rate-limit.guard.ts:8-13
function extractClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const candidate = raw?.split(",")[0]?.trim() || req.ip;
  return candidate ? candidate.slice(0, 100) : "unknown";
}
```

`app.set("trust proxy", …)` is never called — `grep` across `src/` and `scripts/` finds no
proxy-trust configuration and no `CF-Connecting-IP` normalisation. The header is read raw and the
**leftmost** element is taken, which is the element a client controls. A proxy that *appends*
(the conventional behaviour) leaves the forged value in first position, so interposing a proxy
does not close this; only one that *replaces* the header would, and none is declared.

`probes/rate-limit-xff-bypass.probe.ts` drives the real `RateLimitGuard` and the real
`RateLimitService` — imported from backend source, not re-implemented — against the tightest
unauthenticated tier. Output in `commands/backend-rate-limit-xff-bypass.txt`:

```
NODE_ENV=production
tier=auth:login  RATE_LIMIT_TIER key=rate_limit_tier

CONTROL  — 50 requests, X-Forwarded-For fixed at 198.51.100.7
           allowed: 5 / 50   (throttled after the tier limit)

BYPASS   — 50 requests, same socket peer, X-Forwarded-For rotated per request
           allowed: 49 / 50

CONTROL  — 50 requests, no X-Forwarded-For at all (falls back to req.ip)
           allowed: 5 / 50

VERDICT: BYPASSED — rotating the header let 44 extra request(s) through …
```

`NODE_ENV=production` matters: `DEV_LIMIT_MULTIPLIER` (`rate-limit.service.ts:147`) multiplies
every tier by ten outside production, so a probe run in development would measure a limit ten
times the deployed one.

The 49 rather than 50 is an internal consistency check: the rotation reuses `198.51.100.7`, whose
bucket the control run had already exhausted.

**Blast radius.** Authenticated routes key on `req.user.userId` and are unaffected. Every
unauthenticated tier is affected, and those are the tightest ones on purpose:
`auth:login` 5/60s, `auth:register` 3/60s, `auth:email-otp` 3/600s, `auth:mfa-verify` 10/300s
(the comment there reasons explicitly about walking the 10⁶ TOTP space),
`public:job-apply` 3/hour, `public:contact` 5/hour, `support:portal-ticket-create` 10/hour.
The same raw header also feeds `src/common/http/client-ip.ts` and eleven controllers that record
an IP onto sessions, audit rows and pseudonymised roadmap votes.

An edge WAF would mitigate this — which is exactly why it cannot be assumed. Nothing in the repo
declares one.

---

## D2/D3/D4 — the frontend CSP

Two policies exist. Both were captured live from the Next server on `localhost:1000`
(`commands/frontend-localhost-1000-headers.txt`, `commands/frontend-localhost-1000-static-headers.txt`).

That server is running a **production** build of this branch. Three independent confirmations:
the emitted policy contains no `'unsafe-eval'`/`'unsafe-inline'` (the dev branch of both builders
adds them); asset URLs are content-hashed and served `immutable`; and the static-asset policy is
**byte-for-byte identical** to `buildContentSecurityPolicy()` re-derived from source with
`NODE_ENV=production` (`commands/frontend-csp-derived-nextconfig.txt`), including the directive
order and the `wss://` token. So this is the production policy, not a dev artefact.

**Document routes** (everything the `proxy.ts` matcher covers) receive the *middleware* policy:

```
default-src 'self'; script-src 'self' 'nonce-…' https://www.googletagmanager.com
https://www.clarity.ms https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'
https://fonts.googleapis.com; img-src …; font-src 'self' https://fonts.gstatic.com
https://esm.sh; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com
https://*.r2.cloudflarestorage.com https://*.r2.dev https://www.googletagmanager.com
https://www.clarity.ms https://api.razorpay.com https://checkout.razorpay.com
http://localhost:1501; worker-src 'self' blob:; frame-src https://www.googletagmanager.com
https://checkout.razorpay.com https://api.razorpay.com; frame-ancestors 'none';
base-uri 'self'; form-action 'self'
```

**Static assets** (`_next/static`, `favicon.ico`, `*.svg|png|jpg|jpeg|gif|webp` — excluded by the
matcher at `proxy.ts:243-247`) receive the *next.config* policy, which carries
`object-src 'none'`, `https://accounts.google.com`, `https://*.upstash.io` and the `wss://` token.

### D3 — the `next.config.ts` policy is dead on every route that matters

`response.headers.set("Content-Security-Policy", …)` in the middleware (`proxy.ts:236-239`)
overwrites the `headers()` value on every document. Exactly one CSP header is delivered; it is the
middleware's. The policy at `next.config.ts:40-74` is computed, registered at `199-202`, and never
governs a page.

`lib/image-delivery-csp-contract.test.ts:54-57` calls both `POLICIES` "live" and asserts they agree
on `img-src`. It passes (12/12, `commands/frontend-csp-contract-spec.txt`) — and the agreement it
proves is about a policy no browser applies to a document. This is the mechanism by which the two
drifted apart unnoticed:

| directive | next.config only | proxy.ts only |
|---|---|---|
| `script-src` | `accounts.google.com` | nonce, `googletagmanager.com`, `clarity.ms` |
| `connect-src` | `accounts.google.com`, `*.upstash.io`, `wss://` | `fonts.*`, `googletagmanager.com`, `clarity.ms` |
| `frame-src` | `'self'`, `accounts.google.com` | — |
| `font-src` | — | `esm.sh` |
| `object-src` | `'none'` | absent (falls back to `default-src 'self'`) |
| `frame-ancestors` | absent (covered by `X-Frame-Options: DENY`) | `'none'` |

### D2 — the delivered `connect-src` blocks Ably realtime

`lib/ably.ts:20` and `lib/ably.ts:32` construct `Ably.Realtime` clients, consumed by
`features/chat/ably-provider.tsx:10` and `features/support/inbox/support-ably-provider.tsx:9` —
live product features, not dead code. The bundled `ably` client's endpoints, read out of
`node_modules/ably/build/ably-node.js`, are `realtime.ably.io` / `realtime.ably.net` over `wss`,
`rest.ably.io`, and fallbacks `main.[a-e].fallback.ably-realtime.com`.

None of those hosts appears in the delivered `connect-src`, and there is no `wss:` scheme source.
`autoConnect: false` defers the connection; it does not exempt it. Under this policy every chat and
support-inbox realtime connection is refused by the browser.

### D4 — `wss://` is not a valid CSP source expression

`next.config.ts:55` emits the bare token `wss://`. CSP3 `source-expression` admits either
`scheme-source` (`wss:`, with the colon and no slashes) or `host-source` (which requires a
non-empty host). `wss://` is neither, so a browser drops the token and warns. The directive that
was meant to permit websockets never permitted any. It is on the dead policy (D3), so fixing D2
means adding a correct source to `proxy.ts`, not repairing this one.

### D7 — `X-Powered-By: Next.js`

Observed on every frontend response. `poweredByHeader: false` is absent from the `nextConfig`
object at `next.config.ts:98-206`. The backend strips the equivalent header via helmet (confirmed
absent in the probe output), so the two halves of the product disagree on the same control.

### Headers the frontend does set correctly

`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-XSS-Protection: 0`,
`Cross-Origin-Opener-Policy: same-origin-allow-popups`, `Cross-Origin-Resource-Policy: same-origin`.

`Strict-Transport-Security` is correctly **absent** here: `shouldSendStrictTransportSecurity()`
(`next.config.ts:22-27`) suppresses it because `NEXTAUTH_URL` is loopback. Whether it is emitted
in production is a deployed observation, not a local one.

---

## Backend headers, CORS and request limits — measured

`probes/backend-header-probe.mjs` reconstructs, in isolation, exactly the middleware stack
`src/main.ts:90-125` installs ahead of routing, using the backend's own `express`/`helmet`/`cors`,
and prints every header actually emitted. Full output in
`commands/backend-header-probe-output.txt`. It answers only what the repository can answer: TLS,
edge-injected headers and WAF rules are invisible to it.

Emitted on every response:

```
content-security-policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;
  form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';
  script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';
  upgrade-insecure-requests
strict-transport-security: max-age=31536000; includeSubDomains
permissions-policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)
referrer-policy: no-referrer
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
origin-agent-cluster: ?1
x-dns-prefetch-control: off
x-download-options: noopen
x-permitted-cross-domain-policies: none
x-xss-protection: 0
```

`x-powered-by` is absent — helmet removes it.

Two notes, neither a defect for a JSON API. Helmet's default CSP carries
`style-src … 'unsafe-inline'`; it governs no rendered document here. `x-frame-options` is
`SAMEORIGIN`, not `DENY` — `application-security.spec.ts` describes this as "frame denial", which
overstates it slightly. HSTS is emitted by helmet regardless of transport; whether a browser ever
receives it depends on the deployed TLS terminator.

**CORS, measured.** Allowlisted origin → `access-control-allow-origin` echoed with
`access-control-allow-credentials: true`. Hostile origin → **no** `access-control-allow-origin`, on
both the simple request and the preflight. `CORS_ORIGINS` is required and non-empty
(`env.validation.ts:76`), split on commas into an exact-match array (`296-299`); it is never
`origin: true`, never a reflected header, and a wildcard cannot coexist with credentials — the
`cors` package matches array entries by string equality, so `*` would deny rather than reflect.
The development branch (`main.ts:109-112`) additionally admits a request with no `Origin`; that
branch is unreachable when `NODE_ENV=production`.

**Request limits, measured.** A 3,146,763-byte JSON body against the 3,145,728-byte default
(`admission.config.ts:62`) returned **HTTP 413**, and the 413 still carried
`access-control-allow-origin` — the CORS-before-body-parser ordering `main.ts:108` / `:119`
establishes, and which `ingress-bounds.spec.ts` guards in both directions. `urlencoded` is capped
at one third of that (`main.ts:124`). Both parsers are global: `NestFactory.create` is given
`bodyParser: false` so no implicit parser can precede CORS.

`check:body-binding` — **1941** validated body/query slots, **0 unbound**
(`commands/backend-check-body-binding.txt`). `check:bulk-id-limits` — 3384 schema files, no
unbounded id arrays.

---

## Rate-limit design — verified, with four named gaps

`RateLimitGuard` is deliberately **not** an `APP_GUARD` (`app.module.ts:206-211`); admission
control is the ambient layer and rate limiting is targeted via `@UseRateLimit(tier)` on 115 call
sites across 101 declared tiers. `rate-limit-coverage.spec.ts` enforces that targeting and passes.

`RateLimitService.check` **denies** an unknown tier rather than allowing it
(`rate-limit.service.ts:178-183`) — the comment records that the previous fail-open behaviour is
how three routes ran unlimited while looking protected. `check:log-secrets` independently verifies
that every `@UseRateLimit` key exists in `TIERS`.

Four unauthenticated writes are recorded as open gaps with named owners
(`rate-limit-coverage.spec.ts:119-125`), and the spec forbids the list growing silently:

- `POST /internal/audit` — the fourth `INTERNAL_API_SECRET` route; the other three are limited.
- `POST /careers/apply` — tier `public:job-apply` is declared but wired to nothing.
- `POST /csat/:surveyId/responses` — the sibling CSAT controller is limited; this one is not.
- `POST /crm/mailboxes/push` — an HMAC-signed inbound webhook; every comparable one is limited.

D1 applies on top of all of this: where a tier *is* wired and the caller is unauthenticated, the
bucket key is attacker-chosen.

---

## PRD-C163 — what the code encrypts and rotates

**Field-level envelope encryption** (`src/common/security/envelope-encryption.ts`) — AES-256-GCM,
a fresh per-record data key wrapped under a versioned KEK, ciphertext prefixed `enc:v2:` and
carrying an auditable key reference. `EnvKeyProvider` registers `ENCRYPTION_KEY` as `kek:v1` and
every `ENCRYPTION_KEY_V<n>` as `kek:v<n>`, encrypts under the **highest** version and still decrypts
under older ones — key rotation without re-encryption downtime, and without a window where old
ciphertext is unreadable. It fails closed when the key is absent or the referenced key id is not
configured: it returns neither ciphertext nor plaintext.

15/15 specs pass (`commands/backend-encryption-specs.txt`), including tampered-ciphertext
rejection, legacy `enc:v1` read-through, and re-seal onto the envelope scheme without loss.
`ENCRYPTION_KEY` is **required** at boot with a 32-character floor (`env.validation.ts:110-112`).

**Hash-at-rest for inbound support secrets** — `migrations/1008_s09_hash_support_inbound_secrets.sql`
digests `support_channels.inbound_secret` to `sha256:<hex>` and then *asserts* zero plaintext rows
remain, aborting the migration if any survive. The application already wrote hash-only and
dual-read at verification time, so the backfill is idempotent and safe at any moment; it is
deliberately irreversible, with rotation via `PATCH /support/channels/:channelId` as the recovery
path.

**Other rotation surfaces.** `PLACEMENT_SIGNING_KEY` + `PLACEMENT_SIGNING_KEY_PREVIOUS` with
explicit key ids (`env.validation.ts:50-56`); `AUTH_SIGNING_KEYS` as a JSON array of kid-addressed
Ed25519 keypairs, validated shape-wise at load, with an explicit check that private material has
not been pasted into the `publicKey` slot (`jwt-keyring.service.ts:83`).

**Transport to the database** — `pool.config.ts:197` forces `ssl: "require"` for Neon hosts even
if `sslmode` is stripped from the URL, and `pool.config.spec.ts:105` pins that. This is TLS *from*
the app; TLS *to* the app is the deployed half.

**Secret hygiene, measured.** `check:hardcoded-secrets` — 16,053 files scanned, 0 committed
credentials (39 self-tests pass). `check:log-secrets` — 3,650 files, no plaintext secret logging,
and every name the gate guards is withheld by the runtime redactor (23 substrings + 18 exact
names). `check:public-object-urls` — no upload path mints a permanent public URL.

No secret value is reproduced anywhere in this directory; only variable names.

### D5 — bot verification fails open

```ts
// src/common/security/turnstile.service.ts:27-28
const secret = this.config.TURNSTILE_SECRET_KEY?.trim();
if (!secret) return;
```

`TURNSTILE_SECRET_KEY` is `z.string().optional()` (`env.validation.ts:108`) and the production
`superRefine` (`env.validation.ts:241-282`) requires only `CRON_SECRET`, `INTERNAL_API_SECRET`,
`CONTACT_NOTIFICATION_EMAIL` and `APP_DATABASE_URL`. So a production deploy with the variable
unset boots clean and silently accepts unverified submissions on every public form
(`waitlist.service.ts:46`, `contact.service.ts:25`) — while still rendering the widget.

The contrast is inside the same directory: `av-scan.ts:60-62` returns
`{ status: "error", reason: "malware-scanning-disabled" }` in production when no scanner is
configured, rejecting the upload. Same class of optional control, opposite default. Either
`TurnstileService` should throw when unconfigured in production, or the variable should join the
production-required list.

### D6 — a webhook secret nobody validates at boot

`src/config/env-coverage.spec.ts` **fails** on this branch. It runs under `pnpm test`, which CI
executes (`.github/workflows/ci.yml:101`), so this is a red gate, not an observation.
Full output in `commands/backend-env-validation-specs.txt`.

Four variables are read by application code and validated by nothing:

- `CALENDAR_PROVIDER_WEBHOOK_SECRET` — `src/modules/calendar/calendar-webhook-secret.ts:12`
- `REDIS_COMMAND_TIMEOUT_MS` — `src/common/cache/cache.module.ts`
- `RETENTION_SCHEDULER_ENABLED`, `RETENTION_SCHEDULER_TICK_MS` — `src/modules/cron/cron-retention-scheduler.service.ts`

The first is a shared secret. It does at least fail **closed** at request time — unset yields
`503 Calendar provider webhooks are not configured`, and comparison is `timingSafeEqual`. But it
carries no minimum length and no production requirement, so a truncated or weak value ships
silently and the failure surfaces only when a provider delivers.

Three schema variables are also missing from the operator-facing `.env.example`:
`DB_POOL_ACQUIRE_TIMEOUT_MS`, `DB_POOL_ADMISSION_ENABLED`, `DB_POOL_QUEUE_DEPTH`.

The rest of the boot contract is sound: `validate:env` self-test passes,
`BACKEND_JWT_SECRET` ≥ 44 chars, `PORTAL_JWT_SECRET` ≥ 44, `ENCRYPTION_KEY` ≥ 32,
`UNSUBSCRIBE_TOKEN_SECRET` ≥ 32, and production refuses to boot without `APP_DATABASE_URL` or with
it equal to `DATABASE_URL` — the RLS-bypass footgun, spelled out in the error message.

**Secret reuse worth a decision, not a defect.** `PLACEMENT_SIGNING_KEY` and `VOTE_IP_SALT` both
fall back to `BACKEND_JWT_SECRET` when unset. One secret then serves three purposes, and rotating
it rotates all three at once. That is a deliberate, documented fallback; whether it satisfies
C163's "infrastructure secret isolation" is a Security call, not a code fact.

---

## Dependency vulnerabilities

Counts are from `pnpm audit --json` at the SHAs above; advisory data moves, so re-run before
release. Raw reports are in `commands/*-pnpm-audit-*.json`.

**Backend** — gate `check:vulnerabilities` **passes** (self-test 11/11). It audits
`--prod --audit-level=high` and fails on any high or critical, treating an unparseable or
self-contradicting report as inconclusive rather than clean.

| scope | critical | high | moderate | low |
|---|---|---|---|---|
| all deps | 0 | 2 | 3 | 0 |
| production only | 0 | **0** | — | — |

Both highs are `browserslist` (CVE-2026-73088/73089) reached only via `@nestjs/cli > webpack` —
build tooling. Moderates: `qs` ×2 via `express` (array-limit bypass; DoS via attacker-controlled
`isBuffer`), `@xmldom/xmldom` via `mammoth`. `qs` is on the request path and worth an upgrade.

**Frontend** — **no vulnerability gate exists.** `.github/workflows/frontend.yml` runs lint,
type-check, build, tests and ~20 `check:*` gates, and no audit.

| scope | critical | high | moderate | low |
|---|---|---|---|---|
| all deps | 0 | 6 | 7 | 1 |
| production only | 0 | **3** | 6 | 1 |

The one that matters: **`pdfjs-dist` 6.1.200 — "Arbitrary JavaScript execution upon opening a
malicious PDF"**, a *direct* production dependency, fixed in ≥ 6.2.108. In a product that renders
tenant-uploaded documents that is a live path. The other two prod highs are `browserslist` via
`@platejs/toggle > jotai > @babel/core` (build-time). Prod moderates: `@tiptap/core`
(`mergeAttributes` prototype pollution → executable DOM attributes; the editor takes user content),
`mermaid` ×4 via `@excalidraw/excalidraw`, `fflate` via `jspdf`.

No `audit fix` was run.

---

## Classification against the honesty rule

### (A) Ran here — evidence in `commands/`

| Command | Exit | Result |
|---|---|---|
| `jest --runInBand --testPathPattern="(common/security/application-security\|appsec/transport-hardening\|degradation/ingress-bounds\|common/admission/admission-boot\|common/ratelimit/)"` | 0 | 7 suites, **79/79** pass |
| `jest --runInBand --testPathPattern="common/security/(envelope-encryption\|sensitive-field\|secret-encryption)"` | 0 | 2 suites, **15/15** pass |
| `jest --runInBand --testPathPattern="config/(env-coverage\|env.validation)"` | **1** | **RED — 2 failures** (D6) |
| `jest --runInBand --testPathPattern="image-delivery-csp-contract"` (frontend) | 0 | 12/12 pass — but see D3 |
| `node probes/rate-limit-xff-bypass.probe.ts` | **1** | **BYPASSED — 49/50 vs 5/50** (D1) |
| `node probes/backend-header-probe.mjs` | 0 | full header set + 413 + CORS matrix |
| `curl -D - http://localhost:1000/signin` | 0 | delivered document CSP (D2/D3/D7) |
| `curl -D - http://localhost:1000/_next/static/chunks/…` | 0 | delivered static CSP incl. `wss://` (D4) |
| `npm run check:body-binding` | 0 | 1941 slots, 0 unbound |
| `npm run check:hardcoded-secrets` (+ self-test) | 0 | 16,053 files, 0 credentials; 39 self-tests |
| `npm run check:log-secrets` (+ self-test) | 0 | 3,650 files clean; tier/redactor parity |
| `npm run check:vulnerabilities` (+ self-test) | 0 | prod high/critical = 0; 11 self-tests |
| `npm run check:bulk-id-limits` (+ self-test) | 0 | 3,384 schema files, no unbounded id arrays |
| `npm run check:public-object-urls` | 0 | no permanent public URL minted |
| `npm run check:compression` | 0 | compression middleware present |
| `npm run validate:env:self-test` | 0 | rejects a bare environment |
| `pnpm audit --json` (both repos, prod and all) | 1 | counts above |

### (B) Needs a deployed environment

Quoting the criteria's own wording:

- **"deployed TLS"** (C163) — certificate chain, protocol floor, cipher suites, OCSP stapling and
  actual HSTS delivery are properties of a terminator. The repo pins TLS *from* the app to Neon
  (`pool.config.ts:197`); it cannot pin TLS *to* the app.
- **"encryption at rest"** (C163) — beyond the field-level encryption verified above, storage- and
  disk-level encryption is a provider attestation (Neon, R2) plus a console/API artifact.
- **"infrastructure secret isolation"** (C163) — that production secrets live in a manager, are
  scoped per environment and per cell, and are not readable by CI. Nothing in the tree can show
  where a deployed value comes from.
- **"credential/key rotation"** (C163) — the *mechanism* is verified in code (envelope KEK
  versions, `PLACEMENT_SIGNING_KEY_PREVIOUS`, kid-addressed `AUTH_SIGNING_KEYS`). That a rotation
  was *performed*, on a schedule, with the old credential revoked, is an operational record.
- **"deployed edge WAF/rate limits"** (C164) — **no WAF configuration exists in either repo.** No
  Terraform, no `wrangler.toml`, no firewall or headers block in `vercel.json`. Not merely
  unverified: undeclared. This is also the control that would mitigate D1.
- **"malicious traffic behavior"** (C164) — observed response to scanners, floods and injection
  probes at the edge. The application-layer half is covered by `application-security.spec.ts`
  (SSRF including IPv4-mapped and packed-hex loopback, `file:`/`javascript:` schemes, parameterized
  queries) and by the measured 413/CORS matrix. The edge half is not.

### (C) Needs a named human signature

None of C163/C164 is *primarily* a sign-off criterion, but three items here need one and cannot be
resolved by code:

1. **Accepting the frontend production HIGH advisories** (`pdfjs-dist` in particular) or scheduling
   the upgrade — Security.
2. **Accepting the four named rate-limit gaps** as residual risk for this release, or closing them —
   the four owners the spec already names.
3. **Whether `PLACEMENT_SIGNING_KEY`/`VOTE_IP_SALT` falling back to `BACKEND_JWT_SECRET`
   satisfies "infrastructure secret isolation"** — Security.

No decision record is authored here; `architecture-refactor/decisions/` holds no signed records and
this agent is not authorised to add one. **No signature has been given by anyone, and none is
implied by this document.**

---

## Reproducing

```bash
# Backend gates and specs
cd streamlineos-backend
npm run check:body-binding
npm run check:hardcoded-secrets:self-test && npm run check:hardcoded-secrets
npm run check:log-secrets:self-test && npm run check:log-secrets
npm run check:vulnerabilities:self-test && npm run check:vulnerabilities
node node_modules/jest/bin/jest.js --runInBand \
  --testPathPattern="(common/security/application-security|appsec/transport-hardening|degradation/ingress-bounds|common/admission/admission-boot|common/ratelimit/)"
node node_modules/jest/bin/jest.js --runInBand --testPathPattern="config/(env-coverage|env.validation)"   # RED

# The two probes (paths relative to this directory)
node <evidence>/probes/backend-header-probe.mjs "$PWD"
NODE_ENV=production BACKEND_ROOT="$PWD" \
  node -r ts-node/register/transpile-only <evidence>/probes/rate-limit-xff-bypass.probe.ts   # exits 1 on bypass

# Delivered frontend headers (needs a running frontend; the capture above used a
# production build on :1000 that this agent did not start and did not restart)
curl -sS -D - -o /dev/null http://localhost:1000/signin
curl -sS -D - -o /dev/null http://localhost:1000/logo.svg
```

## Caveats

- The frontend header capture used a Next server on `localhost:1000` that this agent did not start.
  It was verified to be running *this* branch's code before being trusted: the static-asset CSP is
  byte-for-byte identical to `buildContentSecurityPolicy()` re-derived from source, and the document
  CSP matches `buildCsp()` including the `esm.sh` font source unique to this revision. It was not
  restarted or otherwise disturbed.
- `probes/backend-header-probe.mjs` reproduces `main.ts`'s middleware order in isolation; it does
  not boot Nest. The 413 it shows carries Express's default error page, whereas the real app routes
  the same error through `AllExceptionsFilter` — visible as
  `[Nest] ERROR [ExceptionsHandler] PayloadTooLargeError` in the `admission-boot.spec.ts` run. The
  status code and the CORS header on it are the same in both.
- Advisory counts are a snapshot. Re-run `pnpm audit` at release time.
