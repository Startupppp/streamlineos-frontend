# Ticket 32 — Provider and deployed-security drills (PRD-C162/C163/C164)

**Audit date** 2026-09-03 · **Auditor** subagent, read-only wave · **No file in either repo was edited.**

| | |
|---|---|
| frontend | `release/code-10-10-v2` @ `26df21488854b5ca72b938802295965783f8b948` |
| backend | `release/code-10-10-v2` @ `66f09164f7056b377331bcc1fff5f128ada06b95` |
| databases | `scratch_head_1010` (owner), live frontend on `:1000`, live backend on `:1501` |
| runtime | Node v25.9.0 · PostgreSQL 18.4 |

**Verdict: partially-met.** All three criteria sit in the PRD's own *"Deferred production-readiness
evidence"* section (`PRD-10-10-CODE-RELEASE-TODO.md:616-622`), whose preamble reads *"intentionally
postponed until infrastructure, provider access and approvers are available… cannot be completed from
mocks."* Each criterion says **deployed**. No deployed environment exists on this machine, so the
deployed half of each is `not-measurable-here` by construction. What *is* measurable is the code
substrate each criterion rests on, and that half is **not clean**: this audit found **21 defects, one
P0 and nine P1**, seven of them not present in the pre-existing evidence directories.

---

## 1. What I read, with numbers

### Pre-existing evidence (read in full before touching code)

Ticket 32 has **no prior file in `reports/`**, but two evidence directories already exist and were
written against **older SHAs**:

| directory | criteria | evidence SHAs | files |
|---|---|---|---|
| `architecture-refactor/final-refactor/evidence/42-production-ops/provider-drills/` | C162 | be `45f8a2e9`, fe `7469d278` | 27 (README + 3 drills + 23 raw logs) |
| `architecture-refactor/final-refactor/evidence/42-production-ops/edge-security/` | C163, C164 | be `45f8a2e9`, fe `7469d278` | 32 (README + 2 probes + 29 command captures) |

**Drift check — the reason this audit is not a copy of those.** Between the evidence SHAs and current
head the backend changed **1 file** (`src/common/pagination/list-query.schema.spec.ts`) and the
frontend changed **4** (calendar toolbar, chat presence ×2, `use-can` test). None touch CSP,
rate-limiting, providers, encryption or headers. So the *code* is materially unchanged — but **one of
the eight defects the edge-security README lists (D6) is nevertheless green at head**, and **one of its
reproduction commands does not reproduce** (§5.4). I re-measured everything rather than inheriting it.

### Backend corpus

| dimension | count |
|---|---|
| modules under `src/modules` | 80 |
| `*.controller.ts` files | 550 |
| route decorators (`@Get/@Post/@Put/@Patch/@Delete/@All`) | 3,648 |
| OpenAPI operations (`frontend/contracts/openapi.json`) | 3,642 |
| `@Public()` declarations | 93 |
| **public (unauthenticated-declaring) write handlers** | **138** — 30 method-level `@Public()`, 108 class-level |
| declared rate-limit tiers (`TIERS`) | 101 |
| `@UseRateLimit(...)` call sites | 115 |
| inbound webhook controllers (`@Controller("webhooks…")`) | 5 |

### The four provider classes named by C162, as they resolve at head

| class | provider | inbound surface | outbound surface | module files |
|---|---|---|---|---|
| payment | Razorpay | `POST /webhooks/payments/:providerKey/:environment/:orgId`, legacy `POST /webhooks/razorpay/:orgId` | orders/payments API | `billing/` 122 |
| realtime | Ably | none (token auth only) | REST publish, `auth.revokeTokens` | `realtime/` 9 |
| email | Resend (Svix) + ZeptoMail | `POST /webhooks/email/:provider` | send API | `email/` 66 |
| push | Web Push / VAPID | none (endpoint status codes) | `webpush.sendNotification` | `push/` 6 + `notifications/` 119 |

Files read end to end for this audit (not skimmed): `payment-webhook-receiver.service.ts` (413 L),
`payment-webhook-health.service.ts` (retry path), `payment-webhooks-public.controller.ts` (52 L),
`razorpay-webhook.controller.ts` (39 L), `provider-event-ledger.ts` (142 L),
`email-webhook.service.ts` (150 L), `email-webhook.controller.ts` (66 L),
`email-suppression.service.ts` (102 L), `web-push.service.ts` (176 L), `ably.service.ts` (token
paths), `external-effect-ledger.ts` (`execute`), `notification-outbox-relay.service.ts` (137 L),
`outbox-publisher.service.ts` (batching), `for-each-org.ts` (enumeration), `rate-limit.guard.ts`,
`rate-limit.service.ts` (TIERS), `rate-limit-coverage.spec.ts` (204 L),
`client-ip.ts`, `turnstile.service.ts`, `envelope-encryption.ts` (120 L), `pool.config.ts` (TLS),
`env.validation.ts` (declarations + production `superRefine`), `calendar-webhook-secret.ts`,
`calendar-provider-webhook.controller.ts`, `integrations-git.controller.ts`,
`hr-interview-booking.controller.ts`, `leads.ingest.controller.ts`, `agent.controller.ts`,
`frontend/proxy.ts` (CSP + matcher), `frontend/next.config.ts` (CSP + headers block),
`frontend/features/payments/components/webhooks-tab.tsx`,
`frontend/lib/image-delivery-csp-contract.test.ts`, `frontend/vercel.json`,
`.github/workflows/frontend.yml`.

### Commands actually run at head

| command | exit | result |
|---|---|---|
| `curl -D - http://localhost:1000/signin` | 0 | document CSP + `X-Powered-By: Next.js` |
| `curl -D - http://localhost:1000/logo.svg` | 0 | static-asset CSP incl. `wss://` |
| `curl -D - http://localhost:1501/health` | 0 | full helmet set, no `x-powered-by` |
| CORS matrix (hostile / allowed / preflight) vs `:1501` | 0 | hostile origin gets **no** ACAO |
| `POST` 3,200,008-byte JSON to `:1501` | — | **HTTP 413** |
| `rate-limit-xff-bypass.probe.ts` (`NODE_ENV=production`) | **1** | **BYPASSED — 49/50 vs 5/50** |
| `npm run check:hardcoded-secrets` | 0 | 16,099 files, 0 credentials |
| `npm run check:log-secrets` | 0 | 3,658 files, 101 tiers, 23+18 redactor names |
| `npm run check:public-object-urls` | 0 | no permanent public URL minted |
| `npm run check:body-binding` | 0 | 1,944 slots, **0 unbound** |
| `npm run check:bulk-id-limits` | 0 | 3,392 schema files, no unbounded id arrays |
| `npm run check:compression` | 0 | compression middleware present |
| `npm run check:vulnerabilities` (backend) | 0 | prod high/critical = 0 |
| `pnpm audit --prod --audit-level=high` (frontend) | **1** | **3 high** (incl. `pdfjs-dist`) |
| jest `config/(env-coverage\|env.validation)` | **0** | **28/28 — D6 is FIXED at head** |
| jest `common/security/(envelope-encryption\|sensitive-field\|secret-encryption)` | 0 | 15/15 |
| jest `(application-security\|transport-hardening\|ingress-bounds\|admission-boot\|ratelimit/)` | 0 | 7 suites, 79/79 |
| jest `common/ratelimit/rate-limit-coverage` `--verbose` | 0 | **5/5 green while blind to 78 routes** |
| jest `src/modules/(email\|realtime\|push)/.*` | 0 | 15 suites, 160/160 |
| jest `src/modules/billing/payments/.*` | 0 | 15 suites, 98 passed / 4 skipped |
| jest `src/common/outbox/.*` | 0 | 7 suites, 55/55 |
| jest `image-delivery-csp-contract` (frontend) | 0 | 12/12 |
| `psql` index catalog on `payment_webhook_events`, `email_suppressions` | 0 | arbiters present, declaration ↔ catalog agree |

Two servers were already running and were **not started, restarted or disturbed** by me. Both were
verified to be head's code before being trusted: the `:1000` document CSP contains the `esm.sh`
font-src that only `proxy.ts` at head emits, carries no `'unsafe-inline'`/`'unsafe-eval'` (i.e. a
production build), and its static-asset policy matches `buildContentSecurityPolicy()` from source
including the `wss://` token; the `:1501` process is `node … --env-file=.env dist/main` and its
header/CORS/413 behaviour comes from `main.ts`, unchanged since the evidence SHA.

---

## 2. Per-criterion assessment

### PRD-C162 — *"Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios."*

**Status: partially-met.** The word is **sandbox**: a live provider account plus a publicly reachable
webhook URL. Neither exists here, and no outbound provider call was made (`.env` holds real
`RAZORPAY_*` test-mode, `ABLY_API_KEY`, `RESEND_API_KEY`, `VAPID_*` credentials on a branch pointed at
a **shared remote Neon branch**; spending provider quota or emitting real mail from a drill is not
reversible). Walking the seven named scenarios × four providers at head:

| scenario | payment | realtime | email | push |
|---|---|---|---|---|
| **replay** | ✅ code + catalog: `ON CONFLICT (provider_id, environment, provider_event_id)` and `uq_payment_webhook_events_provider_env_event` **exist and agree** (verified in `pg_indexes`); the arbiter is inferrable | n/a (no inbound) | ✅ Svix ±300 s at `email-webhook.service.ts:111` — **but no `svix-id` dedupe**, so unlimited replay *inside* the window (F15) | ✅ `ExternalEffectLedger` keyed per endpoint hash |
| **forgery** | ✅ real-HMAC adapter spec, 401 + `recordSignatureFailure`, 404-not-403 | ✅ capability is cell+org+client scoped (`ably.service.ts:49-71`) | ✅ 4 signature paths, fails closed with no secret | ✅ VAPID gate |
| **outage** | ✅ | ✅ | ✅ breaker | ✅ breaker |
| **suppression** | n/a | n/a | ⚠️ **F4 — platform-wide, permanent, no unsuppress path exists anywhere** | ⚠️ mechanism intact (I verified `ExternalEffectLedger.execute:116` rethrows the **original** error, so `error instanceof webpush.WebPushError` still holds through the ledger wrapper and 404/410 pruning works) — **but still zero test coverage** |
| **cancellation** | ⚠️ provider-driven half only; the dunning cron half is untested | ✅ `revokeTokens` by clientId | ✅ unsubscribe token | ✅ ownership-bound `DELETE` |
| **retry-exhaustion** | ❌ **F1 — the exhaustion recovery control is inert** | ✅ DLQ | ✅ `OUTBOX_MAX_RETRIES = 8` → DEAD | ✅ `attempt_count = 5` → DEAD |
| **recovery** | ❌ **F1** | ✅ breaker closes | ⚠️ **F5 — starvation: a backlogged tenant blocks every later tenant's recovery indefinitely** | ⚠️ **F5** |

Not measurable here: a provider-initiated round trip over TLS with the provider's own signature header
and its own redelivery schedule; a real Ably subscribe/reconnect-from-watermark (the repo's own spec is
`it.skip`ped with the reason *"requires Ably infrastructure that is not available in this
environment"*); provider-side retry on 5xx. `RESEND_WEBHOOK_SECRET` and the ZeptoMail credentials are
absent from `.env`, so even a tunnel would not unblock the email leg.

**One more C162 gap nobody has recorded: there is no scheduler.** `frontend/vercel.json` is four lines
(`framework`, `installCommand`, `buildCommand`, `outputDirectory`) with **no `crons` block**, and a
search of both repos finds no schedule declaration for any of the ~60 `/cron/*` routes. Every
"recovery" and "retry" scenario C162 names depends on a tick that is not declared anywhere in the tree.

### PRD-C163 — *"Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation."*

**Status: partially-met.**

- **Deployed TLS** — `not-measurable-here` for the terminator (chain, protocol floor, ciphers, OCSP,
  real HSTS delivery). But the *outbound* leg is auditable and is **defective**: `pool.config.ts:197`
  sets `ssl: "require"` **only when `isNeon`** (`ssl` appears exactly twice in the file: the `isNeon`
  regex at :171 and this conditional). Any non-Neon production Postgres connects with no `ssl` option
  and no warning (**F6**).
- **Encryption at rest** — field-level envelope encryption is genuinely good: AES-256-GCM, per-record
  DEK, versioned KEK, `enc:v2:` prefix, encrypt under the **highest** version and decrypt under any,
  fails closed both ways (`envelope-encryption.ts:34-120`); 15/15 specs pass; `ENCRYPTION_KEY` is
  required at boot with a 32-char floor. Storage/disk-level encryption is a Neon/R2 attestation —
  `not-measurable-here`.
- **Credential/key rotation** — the mechanism *introduces* keys but cannot *retire* them. A repo-wide
  grep shows `encryptEnvelope` is referenced by exactly two non-spec files (its own module and
  `sensitive-field.ts`); `src/scripts/` contains no `rotate`/`reseal`/`reencrypt` job. Nothing
  re-encrypts existing rows, so `ENCRYPTION_KEY` (`kek:v1`) must stay configured **forever** or every
  historical ciphertext becomes permanently unreadable (**F9**). "A rotation was performed on a
  schedule with the old credential revoked" is an operational record — `not-measurable-here`.
- **Infrastructure secret isolation** — `not-measurable-here` (where a deployed value comes from). In
  code, `check:hardcoded-secrets` is clean over **16,099 files** and `check:log-secrets` over **3,658**.
  But **four** purposes share one secret by fallback — `PLACEMENT_SIGNING_KEY`
  (`placement-signature.ts:32`), `VOTE_IP_SALT` (`roadmap.service.ts:89`) and — not in the prior
  evidence — `AI_CONFIRMATION_SECRET` (`ai-confirmation.service.ts:65`) all fall back to
  `BACKEND_JWT_SECRET` (**F17**).

### PRD-C164 — *"Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior."*

**Status: partially-met.**

- **WAF** — `not-met`, and not merely unverified: **no WAF configuration of any kind exists in either
  repository.** No Terraform, no `wrangler.toml`, no `firewall`/`headers` block in `vercel.json`, no
  nginx conf. The backend has a `Dockerfile` and nothing else. Its intent is not declared anywhere
  (**F18**). This is also the one control that would mitigate F2.
- **Rate limits** — measured **broken** two ways by the same missing line. `app.set("trust proxy", …)`
  is absent (grep over `src/` and `scripts/` finds no proxy-trust config and no `CF-Connecting-IP`
  normalisation), so (a) every XFF-keyed limit is attacker-chosen — **49/50 allowed vs a 5/50 control**,
  measured at head — and (b) every `req.ip`-keyed limit (e.g. `email-webhook.controller.ts:52`)
  collapses behind a real proxy to a **single global bucket** keyed on the load balancer (**F2**).
  Worse, the gate that exists to catch un-limited public writes **cannot see 108 of the 138** (**F3**).
- **CORS** — ✅ **measured live and correct.** Hostile origin → no `Access-Control-Allow-Origin` on
  both simple and preflight; allowlisted origin → echoed with `Allow-Credentials: true`.
- **CSP** — ⚠️ two disjoint policies, both captured live. Documents get the middleware policy;
  static assets get the `next.config` policy. The delivered `connect-src` blocks Ably (**F7**), the
  `next.config` policy is dead on every document (**F11**), and its `wss://` token is not a valid CSP
  source expression (**F12**).
- **Headers** — ✅ backend helmet set complete and `x-powered-by` stripped, measured live. ⚠️ frontend
  leaks `X-Powered-By: Next.js` (**F13**); the two halves disagree on HSTS (**F21**).
- **Request limits** — ✅ **measured live: HTTP 413 on a 3,200,008-byte body** against the 3,145,728
  default, with CORS ordering intact. `check:body-binding` 1,944/1,944 bound.
- **Malicious traffic behaviour** — application layer covered by `application-security.spec.ts`
  (79/79 green incl. SSRF, scheme filtering, parameterized queries). Edge behaviour (scanners, floods,
  injection probes at the terminator) is `not-measurable-here`. Bot verification **fails open**
  (**F8**). Frontend dependency vulnerabilities are ungated (**F14**).

---

## 3. Findings

| # | Sev | file:line | summary |
|---|---|---|---|
| F1 | **P0** | `backend/src/modules/billing/payments/payment-webhook-health.service.ts:199` | "Retry" on a failed payment webhook re-runs no effect and erases the failure record |
| F2 | **P1** | `backend/src/common/ratelimit/rate-limit.guard.ts:8` | `X-Forwarded-For` (and `X-Client-Ip`) is attacker-chosen: limits bypassed 49/50, and forged IPs reach e-signature certificates |
| F3 | **P1** | `backend/src/common/ratelimit/rate-limit-coverage.spec.ts:93` | The public-write rate-limit gate is blind to class-level `@Public()` — 108/138 handlers invisible, 78 unlimited, gate green |
| F4 | **P1** | `backend/src/modules/email/email-webhook.service.ts:66` | A spam complaint against one tenant permanently suppresses that address for every tenant; no unsuppress path exists |
| F5 | **P1** | `backend/src/modules/notifications/notification-outbox-relay.service.ts:53` | Global 50-row batch consumed in `asc(organizations.id)` order starves every later tenant indefinitely; 7 workers share the pattern |
| F6 | **P1** | `backend/src/db/pool.config.ts:197` | Database TLS is forced only for Neon hostnames; a non-Neon production DB connects in cleartext with no warning |
| F7 | **P1** | `frontend/proxy.ts:33` | Delivered `connect-src` has no `wss:` and no Ably host — chat and support-inbox realtime are blocked by the browser |
| F8 | **P1** | `backend/src/common/security/turnstile.service.ts:27` | Bot verification fails open when `TURNSTILE_SECRET_KEY` is unset, and it is not production-required |
| F9 | **P1** | `backend/src/common/security/envelope-encryption.ts:44` | Key rotation is add-only: no re-encryption job exists, so `ENCRYPTION_KEY` can never be retired |
| F10 | **P1** | `backend/src/modules/calendar/calendar-provider-webhook.controller.ts:19` | Secret-gated public webhooks (calendar, git) carry no rate limit — unlimited secret/HMAC guessing |
| F11 | P2 | `frontend/next.config.ts:200` | Two disjoint CSPs; the `next.config` one never governs a document, yet a green test calls both "live policies" |
| F12 | P2 | `frontend/next.config.ts:55` | `wss://` is not a valid CSP source expression — browsers drop the token |
| F13 | P2 | `frontend/next.config.ts:98` | `poweredByHeader: false` absent; `X-Powered-By: Next.js` leaked on every response |
| F14 | P2 | `.github/workflows/frontend.yml:1` | No frontend dependency-vulnerability gate; 3 production HIGH advisories ungated |
| F15 | P2 | `backend/src/modules/email/email-webhook.service.ts:63` | Unbounded event loop with one awaited INSERT per element, and no `svix-id` replay dedupe |
| F16 | P2 | `backend/src/modules/finance/controls/provider-bridge.service.ts:78` | `Number(input.grossAmount)` re-floats a money value the receiver deliberately kept in integer/string form |
| F17 | P2 | `backend/src/common/region/placement-signature.ts:32` | Four purposes share `BACKEND_JWT_SECRET` by fallback |
| F18 | P2 | `frontend/vercel.json:1` | No WAF/edge configuration and no cron schedule declared anywhere in either repo |
| F19 | P2 | `backend/src/common/security/envelope-encryption.ts:44` | `ENCRYPTION_KEY_V1` silently overwrites the `kek:v1` derived from `ENCRYPTION_KEY` |
| F20 | P2 | `backend/src/modules/email/email-webhook.service.ts:147` | Multi-recipient bounce suppresses only `to[0]` |
| F21 | P2 | `frontend/next.config.ts:185` | Backend HSTS `max-age=31536000` no-preload vs frontend `63072000; preload` — the two halves disagree |

### F1 (P0) — the payment-webhook "Retry" button is inert, and it destroys the evidence

`payment-webhook-health.service.ts:199-241`:

```ts
async retryEvent(orgId, providerKey, eventId, actor) {
  const event = await this.db.query.paymentWebhookEvents.findFirst({ … });
  if (!event) throw new NotFoundException("Webhook event not found");
  const [updated] = await this.db.update(paymentWebhookEvents)
    .set({ processingStatus: "processed", processedAt: new Date(), errorMessage: null })
    .where(and(eq(id, eventId), eq(orgId, orgId), eq(providerId, provider.id)))
    .returning();
  await this.audit.log({ …, action: "payment_webhook_event.retried" });
  return updated;
}
```

No call to `ProviderBridgeService.recordProviderPayment`. Compare the sibling
`inventory/webhooks.service.ts:243-275`, which *does* call `deliverEvent` before updating — so this is
an omission, not a design choice.

**Failure scenario.** A Razorpay `payment.captured` webhook arrives, is inserted with
`processingStatus:"processed"` (`payment-webhook-receiver.service.ts:248`), and then the bridge throws
(missing GL account, finance module down, FX rate unavailable). The catch at `:330-355` marks the row
`failed`. Nothing redrives it — `processingStatus` is written in exactly **three** places repo-wide
(`:248`, `:345`, `health:218`) and no cron reads `'failed'`. The operator opens Settings → Payments,
sees the red row, and clicks **Retry** (`frontend/features/payments/components/webhooks-tab.tsx:74-78`
renders the button on exactly `processingStatus === "failed"`). The row turns green, `errorMessage` is
nulled, an audit row says `payment_webhook_event.retried` — **and the journal entry for that captured
payment is never created.** A genuine provider redelivery then hits
`uq_payment_webhook_events_provider_env_event` and returns `{ok:true, duplicate:true}`, so the bridge
never re-runs from that path either. The revenue is permanently absent from the general ledger and
every signal in the product says the webhook succeeded.

**Coverage.** `PaymentWebhookHealthService` has **no spec file at all** (`find src -name
"payment-webhook-health*.spec.ts"` → empty). `retryEvent` appears in only two specs, both as
`jest.fn().mockResolvedValue(undefined)` in controller permission fences.

**Fix.** `retryEvent` must re-dispatch. That is not a one-liner: `redactPayload`
(`payment-webhook-receiver.service.ts:29-46`) stores only `{id,status,amount,currency}` per entity, and
the bridge additionally needs `fee` and `createdAt`. Either (a) persist `fee` and `created_at` in
`payloadRedacted` and reconstruct the `recordProviderPayment` call, or (b) make retry
`processingStatus → 'received'` and add a redrive worker that owns re-dispatch. Until either lands,
the button should be removed or disabled rather than reporting success. Add
`payment-webhook-health.spec.ts` asserting that a retry of a `failed` row calls the bridge.

### F2 (P1) — `X-Forwarded-For` and `X-Client-Ip` are attacker-chosen

Reproduced at head with the repo's own probe driving the **real** `RateLimitGuard` and
`RateLimitService`:

```
NODE_ENV=production   tier=auth:login
CONTROL  50 requests, XFF fixed          allowed:  5 / 50
BYPASS   50 requests, XFF rotated        allowed: 49 / 50
CONTROL  50 requests, no XFF (req.ip)    allowed:  5 / 50
VERDICT: BYPASSED — 44 extra requests
```

`rate-limit.guard.ts:8-13` takes the **leftmost** XFF element, which is the element a client controls;
a conventional appending proxy leaves the forged value in first position. `app.set("trust proxy", …)`
is never called.

Two sinks the prior evidence did not name:

1. `auth.controller.ts:96-100` reads **`req.headers["x-client-ip"]` first**, ahead of XFF and `req.ip`.
   No proxy sets or strips that header, so the session/audit IP recorded for
   `POST /auth/magic-link/verify` and `POST /auth/google` is whatever the caller types.
2. `client-ip.ts:5-10` feeds the e-sign public signing flow
   (`sign-public.controller.ts:48,76,88,113,122,134`) → `sign-audit.service.ts:89` →
   `sign-finalization.service.ts:230,348` → **`sign-pdf.service.ts:254`**, which renders
   `` ` from ${event.ipAddress}` `` onto the completion-certificate PDF. **A signer can choose the IP
   address printed on a legally operative e-signature certificate.**
   `sign-public.controller.ts:40` also mixes that IP into the rate-limit key, so the signing limit is
   bypassable the same way.

The *same* missing line breaks the other direction: `email-webhook.controller.ts:52` limits on
`req.ip` alone, which behind a real proxy is the load balancer for every request — one global bucket.

**Fix.** `app.set("trust proxy", <hop count or CIDR list>)` in `main.ts`, then read `req.ip` only
(Express derives it correctly once trust is configured); delete the manual XFF parsing in
`rate-limit.guard.ts:8-13` and `client-ip.ts:5-10`; drop the `x-client-ip` branch in
`auth.controller.ts:98` entirely.

### F3 (P1) — the rate-limit coverage gate is blind to class-level `@Public()`

`rate-limit-coverage.spec.ts` is the release's stated proof that *"an unauthenticated write is an
abusable flow by definition, and one that acquires no limiter fails this spec"* (:23-24). Its parser
walks **upward from the route line only while lines match `/^\s*(@|\/\*|\s*\*|\/\/)/`** (:82) and then
requires `decorators.includes("@Public()")` (:93). A blank line between the constructor and the first
route stops the walk, so a `@Public()` on the **class** is never seen and the handler is `continue`d.

Measured at head by re-implementing the spec's own parser alongside a class-aware one
(script in scratchpad, read-only):

```
tiers = 101
SPEC SEES (method-level @Public writes):  30    unlimited =  4   <- the 4 named gaps
SPEC BLIND (class-level @Public writes): 108    unlimited = 78
```

`jest --testPathPattern="common/ratelimit/rate-limit-coverage" --verbose` → **5/5 PASS**, including
both *"every unauthenticated write is rate-limited, or is a named gap with an owner"* and the
anti-vacuity floor *"finds enough handlers that a broken scan cannot pass vacuously"* (30 > 20).

Of the 78 unlimited invisible handlers, ~68 are `/cron/*` routes guarded by `assertCronSecret` — real
but lower-risk (unlimited guessing of `CRON_SECRET`). The genuinely exposed remainder:

| route | guard | limiter |
|---|---|---|
| `POST /webhooks/calendar/provider` | shared secret header only | **none** |
| `POST /integrations/git/webhook` | HMAC inside the service | **none** |
| `POST /public/interview-booking/:token` | **no guard at all**, writes | **none** |
| `POST /leads/ingest` | `ApiKeyGuard` | **none** |
| `POST /agent/v1/projects`, `…/tickets`, `PATCH /agent/v1/tickets/:id`, `POST …/comments` | `AgentTokenGuard` | **none** |

**Fix.** Make the parser read the file's class-level decorators (scan for `@Public()` within ~6 lines
above `@Controller(`) and union that with the method decorators; raise the anti-vacuity floor from 20
to a number derived from the class-aware count (≥130); then triage the 78 into limiters or named gaps.

### F4 (P1) — a spam complaint permanently suppresses an address for every tenant

`email-webhook.service.ts:66-73` writes every suppressing event with `orgId: null`:

```ts
await this.suppression.suppress({
  email: event.email,
  // Platform-wide: a hard bounce is a property of the address, not a tenant.
  orgId: null,
  reason, source: "PROVIDER_WEBHOOK", …
});
```

The comment reasons about a **hard bounce**, and for `HARD_BOUNCE` platform scope is right. But
`SUPPRESSING_EVENTS` (:13-23) maps `email.complained`, `spam` and `complaint` to `COMPLAINT` through
the same branch. `suppress()` never sets `expiresAt`, so `expires_at` is NULL and `findSuppressed`
(:49) never expires it. And `emailSuppressions` is referenced by exactly **two** non-spec files
repo-wide — the schema and this service — which between them expose only `findSuppressed` and
`suppress`. **There is no DELETE, no UPDATE, no admin route, no expiry writer: no unsuppress path
exists anywhere in the product.**

**Failure scenario.** `alice@corp.com` is an employee of Org A and a customer of Org B. She marks one
Org A broadcast as spam. Resend posts `email.complained`. A platform-wide, non-expiring row is written.
The service's own docblock states *"Suppression is absolute. It applies to mandatory notification types
too"* (:22-24) and is enforced at the single choke point every product email passes
(`email-outbox.service.ts:58`). From that moment Org B's password-reset, invoice and e-signature
emails to Alice are silently dropped, forever, and no operator in either tenant can clear it without
direct SQL.

**Fix.** Scope `COMPLAINT` (and `INVALID_ADDRESS`) per-tenant — the service already supports it and the
partial unique `uniq_email_suppressions_org` exists in the live catalog — reserving `orgId: null` for
`HARD_BOUNCE`. Independently, add an admin read + delete surface (`GET/DELETE
/platform/email-suppressions`) so any suppression is reversible.

### F5 (P1) — one backlogged tenant starves every later tenant's notifications

`notification-outbox-relay.service.ts:52-77`:

```ts
await forEachOrg(this.db, "notification-outbox-relay", async (tx, orgId) => {
  const remaining = BATCH_SIZE - claimed.length;   // BATCH_SIZE = 50, :11
  if (remaining <= 0) return;
  … limit ${remaining} for update skip locked …
});
```

`forEachOrg` enumerates `.orderBy(asc(organizations.id))` (`for-each-org.ts:161`) — a **stable,
deterministic order**. The cron handler calls `flush()` **once** per tick with no drain loop
(`cron-outbox.controller.ts:56-65`). So each tick publishes at most 50 events **platform-wide**, always
drawn from the lowest-id organizations first.

**Failure scenario.** Org A accumulates ≥50 eligible rows (a burst, or a downstream failure that
returns rows to `PENDING` at `:116` up to `MAX_ATTEMPTS = 5`). Every tick, `forEachOrg` reaches Org A
first, `claimed.length` hits 50, and every organization sorted after it gets `remaining <= 0` and
returns immediately. Their rows stay `PENDING` — they never attempt, so they never reach `DEAD`, so
`alert-dead-outbox` (which fires on `retry_count = 8` / `DEAD`) never fires. Notifications for those
tenants simply stop, silently and indefinitely.

The pattern is **systemic**: `grep -rln "remaining <= 0"` returns 7 non-spec files —
`common/outbox/outbox-publisher.service.ts` (BATCH_SIZE 50 — the transport email and push ride),
`modules/notifications/notification-delivery-worker.service.ts` (50 — the actual email/push sender),
`notification-outbox-relay.service.ts` (50), `common/workflow/workflow-outbox-relay.service.ts` (50),
`common/workflow/workflow-store.ts`, `modules/calendar/calendar-provider-sync-sweep.service.ts`,
`modules/payroll/jobs/payroll-jobs-worker.service.ts` (5).

**Fix.** Make the batch fair rather than first-come: either rotate the enumeration start offset per run
(persist a cursor), or give each org a per-org slice (`min(remaining, ceil(BATCH_SIZE / orgCount))`)
and loop until the global budget is spent, or replace `forEachOrg` + per-org `limit` with a single
cross-org `FOR UPDATE SKIP LOCKED` claim ordered by `(created_at, id)`. Add an alert on
`max(age(now(), created_at))` for `state='PENDING'`, which is the signal that is currently absent.

### F6 (P1) — database TLS is conditional on the hostname being Neon

`pool.config.ts:197` — `...(isNeon ? { ssl: "require" as const } : {})`. `ssl` occurs exactly twice in
the file: the `isNeon = NEON_HOST.test(probe)` at :171 and this line. There is no `sslmode` handling
and `collectWarnings` says nothing about TLS.

**Failure scenario.** A cell is provisioned on RDS / Cloud SQL / self-managed Postgres and
`APP_DATABASE_URL` omits `sslmode=require` (easy: the value is often copied from a console that
defaults to a bare URI). `isNeon` is false, no `ssl` option is passed, `postgres.js` connects in
cleartext, and every tenant row — including `enc:v2:` ciphertext's *surrounding* plaintext columns and
every session token in transit — crosses the network unencrypted. Nothing logs, nothing warns, and the
`pool.config.spec.ts` assertion that pins TLS only exercises the Neon branch.

**Fix.** Default `ssl` to `"require"` unconditionally, with an explicit opt-out env var for local
loopback (`DB_ALLOW_INSECURE=1`) that the production `superRefine` rejects.

### F7 (P1) — the delivered CSP blocks Ably realtime

Captured live from `http://localhost:1000/signin` at head:

```
connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com
  https://*.r2.cloudflarestorage.com https://*.r2.dev https://www.googletagmanager.com
  https://www.clarity.ms https://api.razorpay.com https://checkout.razorpay.com
  http://localhost:1501
```

No `wss:` scheme source and no Ably host. `frontend/lib/ably.ts:20,32` constructs two
`Ably.Realtime` clients, consumed by `features/chat/ably-provider.tsx` and
`features/support/inbox/support-ably-provider.tsx` — live product features. Ably's transports are
`wss://realtime.ably.io|.net`, `rest.ably.io` and `main.[a-e].fallback.ably-realtime.com`; none is
listed. `autoConnect:false` defers the connection, it does not exempt it. Under this policy every chat
and support-inbox realtime connection is refused by the browser.

**Fix.** Add `wss://realtime.ably.io wss://realtime.ably.net https://rest.ably.io
https://*.fallback.ably-realtime.com wss://*.fallback.ably-realtime.com` to `buildCsp`'s `connectSrc`
in `frontend/proxy.ts:33-44` — **not** to `next.config.ts`, which never governs a document (F11).

### F8 (P1) — bot verification fails open

`turnstile.service.ts:27-28` — `const secret = …TURNSTILE_SECRET_KEY?.trim(); if (!secret) return;`.
`env.validation.ts:118` declares it `z.string().optional()`, and the production `superRefine`
(:295-335) requires only `CRON_SECRET`, `INTERNAL_API_SECRET`, `CONTACT_NOTIFICATION_EMAIL` and
`APP_DATABASE_URL`. A production deploy with the variable unset boots clean and accepts unverified
submissions on every public form while still rendering the widget. The contrast sits in the same
directory: `av-scan.ts:60-62` returns `{status:"error", reason:"malware-scanning-disabled"}` in
production when unconfigured — same class of optional control, opposite default.

**Fix.** Throw in production when unconfigured, or add `TURNSTILE_SECRET_KEY` to the production
`superRefine` list.

### F9 (P1) — key rotation cannot retire a key

`EnvKeyProvider` (`envelope-encryption.ts:38-52`) registers `ENCRYPTION_KEY` as `kek:v1` and each
`ENCRYPTION_KEY_V<n>` as `kek:v<n>`, encrypts under `max(versions)` and decrypts under whichever id the
ciphertext names. That is correct for *introducing* a key. It provides no way to *finish* a rotation:
`encryptEnvelope` is referenced by only two non-spec files, and `src/scripts/` has no
`rotate`/`reseal`/`reencrypt` job, so no historical row is ever re-wrapped. `unwrap` throws
`Encryption key kek:v1 is not configured` the moment `ENCRYPTION_KEY` is removed.

**Failure scenario.** `ENCRYPTION_KEY` is disclosed. The operator adds `ENCRYPTION_KEY_V2` and removes
the compromised `ENCRYPTION_KEY` — the only meaningful response to a key compromise. Every field
encrypted before that moment becomes permanently undecryptable and every read of it 500s. The only
alternative is to keep the compromised key live forever, which means the rotation did not rotate
anything.

**Fix.** Add a batched, resumable `reseal-envelope` script that walks each `sensitive-field` column,
`decryptEnvelope` → `encryptEnvelope` under the active KEK, and reports remaining `kek:v<old>`
references so a key can be provably retired. F19 (`ENCRYPTION_KEY_V1` silently overwriting the
`ENCRYPTION_KEY`-derived `kek:v1`, order-dependent on `Object.entries`) should be fixed in the same
pass by rejecting a duplicate version id at construction.

### F10 (P1) — secret-gated public webhooks have no rate limit

`calendar-provider-webhook.controller.ts:19` — `@Public()`, writes, carries **no**
`@UseGuards(RateLimitGuard)` and no `@UseRateLimit`. Its only authentication is
`assertCalendarWebhookSecret` (`calendar-webhook-secret.ts:11-28`), a `timingSafeEqual` against
`CALENDAR_PROVIDER_WEBHOOK_SECRET`. `integrations-git.controller.ts:23` is the same shape with an HMAC
verified inside the service. Every other webhook controller in the repo carries a tier
(`billing:webhook` 600/60, `webhook:email` 600/60).

Mitigating: at head `CALENDAR_PROVIDER_WEBHOOK_SECRET` now enforces a 32-character floor
(`env.validation.ts:143-151`), so the secret itself is strong. The gap is that an attacker gets
unlimited attempts against it and the attempts are invisible — unlike the payment path, neither
receiver writes DB state on a signature failure, so no detector fires (`alert-sig-failures` says so
itself: *"git-webhook signature failures are level=warn in structured logs"*).

**Fix.** Add `@UseGuards(RateLimitGuard) @UseRateLimit("webhook:calendar")` and a matching
`webhook:git` tier, and record a failure counter both receivers can alert on.

---

## 4. What head already gets right

Recorded because a finding list read alone misrepresents this code.

- **CORS is correct and I measured it live.** Hostile `Origin` → no `Access-Control-Allow-Origin` on
  both the simple request and the preflight; allowlisted origin → echoed with
  `Access-Control-Allow-Credentials: true`. `CORS_ORIGINS` is required, non-empty, split to an
  exact-match array; never `origin: true`, never reflected.
- **Request limits work.** A 3,200,008-byte JSON body returned **HTTP 413** live, with the CORS header
  still present on the error — the CORS-before-body-parser ordering holds. `check:body-binding`:
  1,944 validated slots, **0 unbound**.
- **Backend security headers are complete**, measured live: full helmet CSP, HSTS,
  `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, COOP/CORP, `Origin-Agent-Cluster`,
  `X-XSS-Protection: 0`, an explicit deny-all `Permissions-Policy`, and **`x-powered-by` absent**.
- **The payment webhook receiver is genuinely well built.** The idempotency key is derived from
  *signed* material only, with a documented reason (`resolveProviderEventId:386-413`); the unsigned
  `x-payment-event-id` header may cross-check the envelope but can never *be* the key. The
  `ON CONFLICT` arbiter `(provider_id, environment, provider_event_id)` **exists in the live catalog**
  as `uq_payment_webhook_events_provider_env_event` — declaration and catalog agree. The provider call
  is made *outside* every `runInTenantTransaction`. Amount scaling resolves the currency's minor-unit
  exponent before dividing (0 for JPY, 3 for KWD), with the ¥100,000-recorded-as-¥1,000 regression
  written into the comment. Signature rejection returns 404 rather than 403 so it does not confirm the
  org exists.
- **`email_suppressions` partial uniques are exactly right.** `uniq_email_suppressions_global`
  `(email, channel) WHERE org_id IS NULL` and `uniq_email_suppressions_org`
  `(org_id, email, channel) WHERE org_id IS NOT NULL`, and `suppress()` passes the matching index
  predicate as the `onConflictDoNothing` `where` — both arbiters are inferrable. Verified against
  `pg_indexes`, not just the schema file.
- **Push expiry pruning survives the ledger wrapper.** I checked the failure shape this codebase has
  shipped before (`err instanceof X` lost across a wrapper — cf. the Drizzle SQLSTATE-on-`.cause`
  memory): `ExternalEffectLedger.execute:114-117` rethrows the **original** error, so
  `error instanceof webpush.WebPushError` at `web-push.service.ts:101` still holds and 404/410
  endpoints are pruned. The prior evidence flagged this as untested; it is untested but **not** broken.
- **The outbox relay is otherwise exemplary**: `FOR UPDATE SKIP LOCKED` in one statement, lease
  expiry, `DEAD` at `MAX_ATTEMPTS`, and a hard rule against swallowing errors, each with the incident
  that motivated it written into the comment. F5 is a fairness defect on top of an otherwise correct
  design.
- **Envelope encryption**: AES-256-GCM, per-record DEK zeroed in `finally`, versioned KEK,
  fails closed on a missing key *and* on an unknown key id, tamper-rejecting. 15/15 specs green.
- **Ably capabilities** are cell-prefixed and scoped to `(org, clientId, channel)`, with revocation by
  `clientId`.
- **Secret hygiene**: 16,099 files with zero committed credentials; 3,658 files with no plaintext
  secret logging; every `@UseRateLimit` key present in `TIERS`; `RateLimitService.check` **denies** an
  unknown tier rather than allowing it.
- **D6 from the pre-existing edge-security README is FIXED at head.**
  `CALENDAR_PROVIDER_WEBHOOK_SECRET` now carries a 32-character minimum with an explanatory message
  (`env.validation.ts:143-151`), `REDIS_COMMAND_TIMEOUT_MS` and `RETENTION_SCHEDULER_*` are declared,
  and `config/(env-coverage|env.validation)` is **28/28 green**. That defect should be struck from the
  ticket.

---

## 5. Corrections to the pre-existing evidence

1. **D6 no longer stands** (above). The edge-security README calls `env-coverage.spec.ts` *"red on this
   branch"*; it is green at head, 28/28.
2. **D1–D5, D7, D8 all still stand at head**, each re-measured independently (§1 command table).
3. **The provider-drills README's spec counts do not reproduce.** Its documented command
   `--testPathPattern="src/modules/billing/(payments|core)/.*(webhook|razorpay|replay|activation)\.spec\.ts$"`
   is claimed to yield *"7 suites, 93 passed"*. At head it yields **2 suites, 49 passed** — and it
   cannot yield more, because the pattern anchors on filenames *ending* in those words, which excludes
   `payment-webhook-security.spec.ts` and `razorpay.adapter.spec.ts`, the two files the README's own
   prose leans on hardest. The real payments figure is **15 suites, 98 passed / 4 skipped** under
   `src/modules/billing/payments/.*\.spec\.ts$`. The finding is not that the specs are missing — they
   pass — but that a documented reproduction step in an evidence directory does not reproduce.
4. **The provider-drills matrix marks push *suppression* CODE-VERIFIED "gap 1".** That is right about
   the missing test and, per §4, right about the code — I verified the error identity survives the
   ledger wrapper, which was the only plausible way for it to be silently broken.
5. **Three secret fallbacks, not two.** The edge-security README names `PLACEMENT_SIGNING_KEY` and
   `VOTE_IP_SALT`; `AI_CONFIRMATION_SECRET` (`ai-confirmation.service.ts:65`) is a third.

---

## 6. Blocked on infrastructure — what would actually measure it

Nothing in this list can be closed from this machine, and none of it is claimed.

| criterion | blocked item | what would measure it |
|---|---|---|
| C162 | live payment sandbox round trip | a deployment with a public HTTPS URL + a tunnel; the Razorpay `rzp_test_…` key is already in `.env`, so this is unblocked by deployment, not procurement |
| C162 | live email bounce/complaint round trip | `RESEND_WEBHOOK_SECRET` + ZeptoMail credentials (**absent from `.env`**) plus a public URL |
| C162 | Ably subscribe / reconnect-from-watermark | an Ably app; the repo's own spec is `it.skip`ped with that reason |
| C162 | provider-side redelivery on 5xx | the provider's retry scheduler — cannot be simulated honestly |
| C162 | a declared cron schedule | there is none in either repo (F18); a scheduler must exist before recovery timing means anything |
| C163 | deployed TLS | `testssl.sh` / `sslyze` against the terminator: chain, TLS ≥1.2 floor, cipher list, OCSP stapling, observed HSTS |
| C163 | encryption at rest | Neon + R2 console/API attestation of volume and bucket encryption, with key ownership |
| C163 | infrastructure secret isolation | secret-manager export showing per-environment/per-cell scoping and that CI cannot read production values |
| C163 | rotation *performed* | an operational record: rotation date, old credential revoked, `reseal` run to completion (which needs F9 fixed first) |
| C164 | edge WAF | there is no WAF config to verify (F18) — declaring one is a prerequisite, not a measurement |
| C164 | malicious traffic behaviour at the edge | a controlled scanner/flood/injection run against the deployed origin with WAF logs captured |
| C164 | HSTS delivery | observable only over real TLS; `shouldSendStrictTransportSecurity()` suppresses it on loopback by design |
| — | `check:alert-ack` | a real `ALERT_WEBHOOK_URL` and a human acknowledgement |

Three items additionally need a **named human signature**, and no signature has been given here:
accepting or scheduling the frontend production HIGH advisories (F14); accepting the now-82 unlimited
public writes as residual risk or closing them (F3); and whether one secret serving four purposes
(F17) satisfies C163's "infrastructure secret isolation".

---

## 7. Completion-evidence status for the ticket

The ticket's "Completion evidence" asks for SHAs, commands, pass/fail/skip counts, artifact locations,
and PRD/traceability checkbox updates in the same commit. SHAs, commands and counts are in §1.
Artifacts remain the two existing `42-production-ops/` directories plus this report.

**The PRD checkboxes for C162/C163/C164 must NOT be ticked at this commit.** All three say *deployed*;
the deployed half is untested; and the code half now carries one P0 and nine P1 defects, which also
blocks `PRD-C160` ("No unresolved code-level P0/P1 finding remains"). F1, F2, F3, F4 and F7 are
code-level and fixable in this repo today; F5, F6, F8, F9 and F10 likewise. Only after those are closed
does the remaining gap become genuinely infrastructure-shaped.
