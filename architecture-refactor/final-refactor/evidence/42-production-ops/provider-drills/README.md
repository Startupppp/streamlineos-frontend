# PRD-C162 — provider drills (payment · realtime · email · push)

**Ticket** 32 · `.scratch/code-release-10-10-v2/issues/32-provider-security-drills.md`
**Criterion** PRD-C162 — *"Run real payment, realtime, email and push sandbox replay, forgery,
outage, suppression, cancellation, retry-exhaustion and recovery scenarios."*

| | |
|---|---|
| backend SHA | `45f8a2e99494483526e357e27f18c76961ebf266` (`release/code-10-10-v2`) |
| frontend SHA | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) |
| database | `postgresql://tarunchintakunta@localhost:5432/scratch_head_1010` — REACHED_HEAD 677/677, 944 tables |
| runtime | Node v25.9.0 · PostgreSQL 18.4 (Homebrew, aarch64) |
| run date | 2026-09-03 |

**Result — of the 32 cells in the matrix below: 23 PROVEN by a command run here, 3 CODE-VERIFIED,
2 n/a (the provider has no such surface), 4 NEEDS SANDBOX CREDENTIALS.** Nothing in this directory
was simulated and presented as a live provider result, and no outbound call was made to any provider.

PRD-C162 names **seven** scenarios — replay, forgery, outage, suppression, cancellation,
retry-exhaustion, recovery — not nine; the matrix carries those seven plus one row for the live
round trip that only a deployment can supply, across four providers.

---

## The four providers

The criterion names four provider classes. In this codebase they resolve to:

| class | provider(s) | inbound surface | outbound surface |
|---|---|---|---|
| **payment** | Razorpay (`src/modules/billing/payments/adapters/razorpay.adapter.ts`) | `POST /webhooks/payments/:providerKey/:environment/:orgId` and legacy `POST /webhooks/razorpay/:orgId` | orders API |
| **realtime** | Ably (`src/modules/realtime/ably.service.ts`) | **none** — token-auth only, no inbound webhook | REST publish + `auth.revokeTokens` |
| **email** | Resend (Svix-signed) + ZeptoMail (`src/modules/email/email-webhook.service.ts`) | `POST` bounce/complaint callbacks | send API |
| **push** | Web Push / VAPID (`src/modules/realtime/web-push.service.ts`) | **none** — endpoint status codes only | `webpush.sendNotification` |

That asymmetry drives the matrix: *forgery* and *replay* are inbound-webhook scenarios, so they are
real scenarios for payment and email and structurally absent for realtime and push.

---

## The matrix

`PROVEN` = a command in this directory produced the quoted output.
`CODE-VERIFIED` = the path was read end to end and is correct, but no command exercises it here.
`NEEDS SANDBOX CREDENTIALS` = requires a live provider account plus a publicly reachable deployment.

| scenario | payment (Razorpay) | realtime (Ably) | email (Resend/Zepto) | push (VAPID) |
|---|---|---|---|---|
| **replay** | **PROVEN** — D1 + 3 specs | no inbound → **PROVEN** on the outbox hop (`inbox-consumer`) | **PROVEN** — Svix ±300 s window spec | **PROVEN** — effect-ledger spec |
| **forgery** | **PROVEN** — D2 + real-HMAC spec | no inbound → **PROVEN** capability scoping | **PROVEN** — 4 signature specs | no inbound; **CODE-VERIFIED** VAPID gate |
| **outage** | **PROVEN** — `failure-drill` | **PROVEN** — real fault server, 503 | **PROVEN** — breaker spec | **PROVEN** — breaker spec |
| **suppression** | n/a | n/a | **PROVEN** — D3 + webhook spec | **CODE-VERIFIED** — no spec (gap 1) |
| **cancellation** | **CODE-VERIFIED** (dunning cron) | **PROVEN** — revocation spec | **PROVEN** — 16 unsubscribe-token specs | **PROVEN** — unsubscribe ownership spec |
| **retry-exhaustion** | **PROVEN** — redrive-window spec | **PROVEN** — DLQ propagation spec | **PROVEN** — D5 + e2e exit 1 | **PROVEN** — D5 + e2e exit 1 |
| **recovery** | **PROVEN** — e2e clear | **PROVEN** — breaker probe closes | **PROVEN** — e2e clear | **PROVEN** — e2e clear |
| **live sandbox round trip** | NEEDS SANDBOX CREDENTIALS | NEEDS SANDBOX CREDENTIALS | NEEDS SANDBOX CREDENTIALS | NEEDS SANDBOX CREDENTIALS |

The last row is the one thing no local command can stand in for, and it is called out separately
rather than folded into the rows above. See **What is not proven here**.

D4 (outbox `retry_count = 8` → `DEAD`) sits under email and push in the table because the outbox is
the transport those two channels ride; the payment cell cites the redrive-window spec instead,
because payment retry exhaustion is `ProviderEventLedger.listRedrivable`'s `maxAgeMs` boundary, not
the outbox ceiling.

---

## What was run

Every command below was executed against the local head database. Raw stdout is in `raw/`.

### 1. Detector self-tests — all five pass (`raw/*-self-test.txt`)

A self-test feeds the detector a synthetic row that *should* fire and one that *should not*, and
fails if either verdict is wrong. It proves the predicate discriminates; it needs no cloud.

```
npm run alert:sig-failures:self-test      exit 0  {"pass":true,"case1FiresOnFailingEndpoint":true,"case2ClearsOnStaleFailure":true}
npm run alert:dead-outbox:self-test       exit 0  {"pass":true,"case1FiresOnDeadRow":true,"case2ClearsOnStaleRow":true}
npm run alert:dead-delivery:self-test     exit 0  {"pass":true,"case1FiresOnDeadRow":true,"case2ClearsOnStaleRow":true}
npm run check:outbox-consumers:self-test  exit 0  check-outbox-consumers self-tests: 30 passed
npm run failure-drill:self-test           exit 0  {"pass":true,"checks":{"allFiveDrillsPresent":true,
                                                   "allDrillsReturnDryRunWithoutExecuteFlag":true,
                                                   "cacheLossBlockedInExecuteMode":true,
                                                   "badReleaseBlockedInExecuteMode":true,
                                                   "badReleaseNotFakePass":true}}
```

### 2. Failure drills (`raw/failure-drill-*.txt`)

```
npm run failure-drill                                            exit 0   all 5 drills dry-run
node src/scripts/failure-drill.mjs --drill=provider-outage --execute
                                                                 exit 0   {"outcome":"pass"}
node src/scripts/failure-drill.mjs --drill=queue-backlog --execute
                                                                 exit 0   {"outcome":"pass",
                                                                           "ageSecs":600,"rowCount":1}
```

`cache-loss` and `database-cell-failure` are deliberately `blocked` in execute mode by the drill
itself (a shared-Redis `FLUSHDB` drops every tenant's sessions). That is the script's own refusal,
not a skip on my part.

> **Prerequisite worth recording:** `queue-backlog --execute` first returned
> `{"outcome":"fail","error":"null value in column \"organization_id\"…"}` because it inserts
> `(SELECT id FROM organizations LIMIT 1)` and `scratch_head_1010` was schema-only. It passed on
> re-run only after a concurrent agent's `compliance:drill` left one synthetic org behind. **This
> drill has an undeclared seeded-data prerequisite (≥1 `organizations` row) and reports a bare
> NOT NULL error instead of skipping.** Both runs are in `raw/failure-drill-queue-backlog-execute.txt`.

### 3. Live SQL drills against the real head schema (`drills/provider-drills.sql`)

```
psql "postgresql://tarunchintakunta@localhost:5432/scratch_head_1010" \
  -v ON_ERROR_STOP=1 -f drills/provider-drills.sql        exit 0
```

One transaction, `ROLLBACK` at the end, fixtures prefixed `drill-c162-`. The script's own
post-rollback assertion prints `0 | 0 | 0 | 0 | 0`. Full transcript: `raw/provider-drills-sql.txt`.

- **D1 — payment replay.** The same `provider_event_id` inserted twice through the receiver's exact
  `ON CONFLICT (provider_id, environment, provider_event_id) DO NOTHING`. First delivery returns
  one row; the replay returns **zero rows**, which is the bit the service turns into
  `{ok:true, duplicate:true}` (`payment-webhook-receiver.service.ts:245-281`). Stored rows: **1**.
  - D1b: the same event id in `live` *does* insert — the fence is per environment, so a test-mode
    id cannot swallow the live-mode event of the same name.
  - D1c: tenant B replaying tenant A's event id **does** insert, because it lands on a different
    `provider_id`. The DB fence is not the tenant fence; `ProviderEventLedger` /
    `billing-webhook.handler.ts:92` is, and it logs *"event id already recorded against another
    tenant"* and returns 409. Recorded because it is the one place the two fences could be confused.
- **D2 — payment forgery.** Wrote the exact end state a bad HMAC produces
  (`status='failing'`, `failure_reason='Invalid signature'`, per `recordSignatureFailure`,
  `payment-webhook-receiver.service.ts:191-198`) and ran the **verbatim** predicate from
  `alert-sig-failures.mjs`: **1 row**. Aged the failure past the 24 h window: **0 rows** — it clears
  rather than flapping.
- **D3 — email suppression.** A Resend `email.bounced` writes a platform-wide row; the redelivered
  bounce returns **0 rows** (idempotent, not a second row); the verbatim `findSuppressed` predicate
  from `email-suppression.service.ts:42-54` returns **only** `bounced@`, correctly excluding a clean
  address, an expired suppression, and another tenant's row. Re-run for org B additionally returns
  that tenant's own suppression.
- **D4 — outbox retry exhaustion.** `retry_count = 8` (`OUTBOX_MAX_RETRIES`, `outbox-envelope.ts:8`)
  → `DEAD`; the verbatim `alert-dead-outbox.mjs` predicate returns exactly that row and **not** the
  `retry_count = 7` row that is still retrying.
- **D5 — push/email channel retry exhaustion.** `notification_deliveries` at `attempt_count = 5 /
  max_attempts = 5` → `DEAD` on both `PUSH` and `EMAIL`; the verbatim `alert-dead-delivery.mjs`
  predicate returns **2 rows** and skips the `3/5` row still in flight.
- **D6 — recovery.** After the provider returns, all three alert predicates go to `0 | 0 | 0`.

### 4. End-to-end alert fire-and-clear, real exit codes (`drills/*.sh`)

The SQL drills prove the predicates. These two scripts prove the **shipped scripts** fire, by
committing rows, running `node src/scripts/alert-*.mjs` unmodified, and observing the process exit
code — then deleting the rows under an `EXIT` trap. Both end with a residual-row count of zero.

`drills/alert-sig-failures-fire-and-clear.sh` → `raw/alert-sig-failures-e2e-fire-and-clear.txt`

```
BEFORE     {"fired":false,"count":0}                                        EXIT 0
AFTER      {"fired":true,"count":1,"rows":[{"org_id":"drill-c162-sig-e2e",
            "provider_key":"razorpay","environment":"live","status":"failing",
            "failure_reason":"Invalid signature"}]}                         EXIT 1
RECOVERED  {"fired":false,"count":0}                                        EXIT 0
CLEANED    0 endpoints, 0 providers, 0 orgs
```

`drills/alert-dlq-fire-and-clear.sh` → `raw/alert-dlq-e2e-fire-and-clear.txt`

```
BEFORE   dead-outbox {"fired":false}  EXIT 0   dead-delivery {"fired":false}  EXIT 0
AFTER    dead-outbox {"fired":true,"count":1,"rows":[{"retry_count":8,
                      "last_error":"email provider outage: 503 x8"}]}         EXIT 1
         dead-delivery {"fired":true,"count":2,"rows":[
                      {"channel":"PUSH","attempt_count":5},
                      {"channel":"EMAIL","attempt_count":5}]}                 EXIT 1
RECOVERY dead-outbox {"fired":false} EXIT 0    dead-delivery {"fired":false}  EXIT 0
CLEANED  0 outbox, 0 deliveries, 0 orgs
```

An exit code of 1 is the contract the scripts advertise (`"destination":"CONFIGURE_ME — wire
exit-code 1 to your oncall system"`), so this is the full detector contract exercised end to end.

### 5. Specs (`raw/jest-*.txt`)

All runs `--runInBand`, `nice -n 10`, `DATABASE_URL` pointed at the local head DB.

| pattern | suites | tests | exit |
|---|---|---|---|
| `src/modules/billing/(payments\|core)/.*(webhook\|razorpay\|replay\|activation)` | 7 | **93 passed** | 0 |
| `src/modules/billing/core/billing-webhook` (verbose re-run) | 1 | **38 passed** | 0 |
| `src/common/outbox/.*` | 7 | **55 passed** | 0 |
| `src/modules/(email\|realtime\|push)/.*` | 14 | **151 passed** | 0 |
| `src/modules/notifications/(circuit-breaker\|delivery-class\|delivery-worker-provider-validation)` | 3 | **47 passed** | 0 |
| scenario cross-cut (verbose, see below) | 8 | **59 passed** | 0 |
| `src/degradation/.*` | 11 | **111 passed, 12 skipped, 2 failed** | 1 |

The named scenario evidence inside those runs:

- **Payment forgery, real HMAC bytes** — `adapters/razorpay.adapter.spec.ts` computes a genuine
  `createHmac("sha256", secret)` and asserts: accepts a correctly signed body · rejects a tampered
  body · rejects a signature made with the wrong webhook secret · returns false rather than throwing
  on malformed input. This is the forgery scenario at the crypto layer, not a mock.
- **Payment forgery, service layer** — `payment-webhook-security.spec.ts`: *"returns 401 when the
  signature does not match"* · *"writes no ledger row when the signature is rejected"* ·
  *"returns 404, not 403 — a 403 leaks that the org exists to an attacker"* · plus the deny-by-default
  rate-limit tier assertions.
- **Payment replay** — `payment-webhook-security.spec.ts` *"returns 200 ok:true duplicate:true on the
  second delivery"*; `provider-event-ledger.spec.ts` all 6 (RECORDED / RETRY / PROCESSED / ERROR, and
  *"two different orgs can each claim the same (provider, event_id)"*); `revenue-event-replay.spec.ts`
  all 7 — a replayed refund derives the **same** outbox event id, so the downstream fence agrees.
- **Email forgery + replay** — `email-webhook.spec.ts` 10/10: *"rejects a forged signature"* ·
  *"rejects a signature computed over a different body"* · **"rejects a replayed request outside the
  timestamp window"** (Svix ±300 s, `email-webhook.service.ts:111`) · *"fails closed when no signing
  secret is configured"* · both ZeptoMail shared-secret cases.
- **Email cancellation (unsubscribe)** — `email/unsubscribe-token.spec.ts` 8/8 and
  `crm/consent/unsubscribe-token.spec.ts` 8/8: rejects a tampered payload, a tampered signature, a
  token signed with another key, an expired token; fails closed with no secret; **refuses to sign
  with a secret under 32 chars**.
- **Realtime outage** — `degradation/realtime-adapter.spec.ts` 15/15 including the integration case
  *"when Ably REST endpoint is unreachable, publish throws and the outbox event in Postgres is
  unaffected"*, run against a real `FaultServer` returning 503 and real Postgres.
- **Realtime cancellation** — `chat-realtime-revocation.spec.ts` 3/3: revocation + capability refresh
  land in one post-commit outbox transaction, old tokens are revoked **before** capabilities refresh,
  and a provider failure propagates so the publisher retries and can DLQ it.
- **Push replay** — `external-effect-ledger.spec.ts` 6/6: *"records success and suppresses a later
  replay"* · *"records a provider failure and permits a retry"* · lease contention · crash-window
  reclaim · *"fails closed when completion loses the lease after the provider call"*. This is the
  fence `WebPushService.sendToUser` uses, keyed per subscription endpoint hash
  (`web-push.service.ts:87-94`).
- **Outage / recovery for email + push** — `notification-circuit-breaker.spec.ts` 8/8: opens on the
  threshold failure, shrinking retry delay, single probe after cooldown, re-opens immediately on a
  failed probe, **closes and resets after a successful probe** (the recovery half), and is isolated
  per `(org, channel)` so one tenant's bad credentials cannot stop email for everyone.
- **Retry ceilings** — `degradation/email-provider.spec.ts`: *"shouldDeadLetter returns true at
  exactly OUTBOX_MAX_RETRIES — event is dead-lettered, not discarded"* and *"no infinite retry loop"*.
- **Payment retry exhaustion and operator hand-off** — `billing-webhook.spec.ts` 38/38, notably
  *"returns 500 so the provider retries"* · *"re-runs the grant when the recorded event was never
  acknowledged"* · *"a retry does not double-credit once the effect has already succeeded"* ·
  **"bounds the claim window at both ends, so an event past the dead-letter age is left alone"**
  (the exhaustion boundary, `provider-event-ledger.ts:105-133`) · *"lists the events whose effects
  never completed, without their raw payload"* (the operator queue the exhausted event lands in) ·
  *"returns 503 while a concurrent attempt holds the grant lease"* · *"refuses an event id already
  held by another tenant instead of reporting success"* · *"leaks neither key nor secret in the
  rejection body"* · *"guards the payment upsert so a stale status cannot overwrite a later one"*
  (out-of-order replay defence, `billing-payment-state.ts:21`).
- **Push cancellation** — `push/push-tenant-isolation.spec.ts`: *"includes userId in the delete WHERE
  so an attacker cannot remove another user's subscription"* plus the same-user control, i.e.
  `DELETE /push/subscribe` cancels only the caller's own registration.
- **Push payload minimisation** — `realtime/push-payload.spec.ts` 5/5: no free-text content field,
  smuggled content is stripped, the category is enum-bounded. Not a forgery test, but it is why a
  compromised push endpoint cannot exfiltrate message bodies.

### 6. Consumer coverage

```
npm run check:outbox-consumers   exit 0
  Scanned 3647 TypeScript files · 216 modules reachable from AppModule · 1209 providers
  Emitted 24 · Declared 29 · REGISTERED 29
  OK — every emitted outbox event type has a consumer registered from AppModule
```

Relevant because a dead-lettered event with no registered consumer would never be redriven.

---

## Cancellation — how it actually works

Recorded plainly because it does not match the shape the criterion implies.

The payment adapter surface is **orders and payments only** —
`PaymentProviderRuntime` (`payment-provider-adapter.interface.ts:21-32`) has no subscription
methods, and there is no `subscriptions.create` call anywhere in `src`. Razorpay
never owns the subscription, so **there is no provider `subscription.cancelled` webhook to receive**.
`billing-webhook.handler.ts:77-78` ignores any event without a `payload.payment.entity` and answers
`{ok:true, ignored:<event>}`.

Two artefacts confirm this is settled rather than half-built:
`subscriptions.razorpay_subscription_id` exists and is indexed (`subscriptions.ts:14,26`) but a
repo-wide grep finds **only reads** — one admin projection at `platform-admin.service.ts:157` — and
no writer anywhere; `select count(*) from subscriptions where razorpay_subscription_id is not null`
on the head database returns **0**.

The subscription lifecycle is ours, and the provider drives one hop of it:

| transition | trigger | code |
|---|---|---|
| `ACTIVE` → `PAST_DUE` | **provider** `payment.failed` webhook | `billing-webhook-effects.ts:97-99` → `billing-payment-state.ts:85` |
| `PAST_DUE` → `CANCELLED` | our dunning cron at day N | `cron-billing.service.ts:275-320` (+ churn revenue event, plan-limit bust, owner notification) |
| `TRIAL` → `EXPIRED` | our trial-expiry cron | `cron-billing.service.ts:55-67` |

So payment **cancellation is CODE-VERIFIED, not PROVEN** — the provider-driven half
(`payment.failed` → `PAST_DUE`) is covered by `billing-webhook.spec.ts`, but no command here drives
the dunning cron to a terminal `CANCELLED`. Realtime cancellation (token revocation), email
cancellation (unsubscribe token) and push cancellation (`DELETE /push/subscribe`, ownership-bound in
`push-tenant-isolation.spec.ts`) *are* PROVEN by the specs listed above.

---

## Gaps found while doing this

Three real findings, none of them blockers, all worth an owner.

1. **Push suppression has no spec.** `WebPushService` treats 404/410 from the push endpoint as
   expiry and deletes the subscription (`web-push.service.ts:13, 101-117`). A repo-wide grep for
   `WebPushError` / `expiredEndpoints` / `410` across every `*.spec.ts` finds **no test** — the only
   `410` hits are an unrelated token count and an arithmetic fixture. The behaviour is correct on
   reading, but it is the one suppression path of the four with no assertion behind it, and the
   failure mode is silent: a stale endpoint would be retried to its ceiling on every notification
   instead of being pruned. `WebPushService.configured === false` (VAPID keys absent) is likewise
   untested.
2. **Git-webhook signature failures are undetectable without a log aggregator.** `alert-sig-failures`
   says so itself: *"git-webhook signature failures are level=warn in structured logs — configure log
   aggregator separately"*. Payment webhooks write `payment_webhook_endpoints.status`; the git
   integration writes no DB state, so a forged `X-Hub-Signature-256` fires nothing. This is a
   deployed-environment dependency (a log pipeline), not a code gap.
3. **`failure-drill --drill=queue-backlog --execute` needs a seeded org and does not say so** — it
   fails with a raw NOT NULL error instead of `{"outcome":"skip"}` the way the other drills skip on a
   missing `DATABASE_URL`. Detail in §2 above.

Also observed, not a finding but material for anyone reading the raw logs:
`src/degradation/read-replica.spec.ts` fails 2 tests with *"Client network socket disconnected before
secure TLS connection was established"*. It reaches for `DB_REPLICA_URL` — a remote physical replica.
That is category (B) below, not a regression, and it is out of PRD-C162's scope.

---

## What is not proven here

### (B) Needs a deployed environment / live provider sandbox

There is **no deployed environment and no publicly reachable webhook URL on this machine.** The
following cannot be honestly claimed and are not:

- **A real provider-initiated webhook round trip.** Razorpay, Resend and ZeptoMail deliver to a
  public HTTPS URL. Everything above drives the receiver's own code and its DB fences directly.
  The transport leg — TLS, the provider's real signature header, its own retry/redelivery schedule —
  is untested. Note that a Razorpay **test-mode** key (`rzp_test_…`) *is* present in the backend
  `.env`, so this is unblocked by a tunnel plus a deployment, not by procurement.
- **A real Ably subscribe/replay round trip.** The spec that would prove reconnect-from-watermark is
  `it.skip`ped in the repo with its own reason: *"requires Ably infrastructure that is not available
  in this environment"*. It is skipped upstream; I did not skip it.
- **Provider-side redelivery on outage.** Proving a provider retries a 5xx and that our idempotency
  fence absorbs its redelivery needs the provider's retry scheduler.
- **`RESEND_WEBHOOK_SECRET` and the ZeptoMail credentials are absent from `.env`**, so even with a
  tunnel the email bounce webhook could not be verified against a live account without them.

### Credentials deliberately not used

`.env` holds `RAZORPAY_*` (test mode), `ABLY_API_KEY`, `RESEND_API_KEY` and `VAPID_*`. **No outbound
call was made to any provider with them.** They are shared team credentials on a branch whose
`DATABASE_URL` points at a shared remote Neon branch; spending real provider quota or emitting real
email from a drill is not reversible. Every drill here runs against the local database or in-process.

### (C) Needs a named human decision

None. PRD-C162 asks for scenarios to be run, not for anything to be accepted or signed. No decision
record is authored for this criterion, and none should be. (PRD-C163 and PRD-C164 on the same ticket
are a different matter and are out of this scope.)

---

## Reproducing

```bash
cd /Users/tarunchintakunta/Personal/streamline/streamlineos-backend
export DATABASE_URL='postgresql://tarunchintakunta@localhost:5432/scratch_head_1010'

npm run alert:sig-failures:self-test
npm run alert:dead-outbox:self-test
npm run alert:dead-delivery:self-test
npm run check:outbox-consumers:self-test
npm run failure-drill:self-test
npm run check:outbox-consumers
node src/scripts/failure-drill.mjs --drill=provider-outage --execute
node src/scripts/failure-drill.mjs --drill=queue-backlog  --execute   # needs >=1 organizations row

EV=/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/architecture-refactor/final-refactor/evidence/42-production-ops/provider-drills
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$EV/drills/provider-drills.sql"
bash "$EV/drills/alert-sig-failures-fire-and-clear.sh" "$DATABASE_URL" "$PWD"
bash "$EV/drills/alert-dlq-fire-and-clear.sh"          "$DATABASE_URL" "$PWD"

J="node --max-old-space-size=3072 ./node_modules/jest/bin/jest.js --runInBand"
$J --testPathPattern="src/modules/billing/(payments|core)/.*(webhook|razorpay|replay|activation)\.spec\.ts$"
$J --testPathPattern="src/common/outbox/.*\.spec\.ts$"
$J --testPathPattern="src/modules/(email|realtime|push)/.*\.spec\.ts$"
$J --testPathPattern="src/modules/notifications/(notification-circuit-breaker|notification-delivery-class|notification-delivery-worker-provider-validation)\.spec\.ts$"
$J --testPathPattern="src/degradation/.*\.spec\.ts$"
```

Both `.sh` scripts commit rows and delete them under an `EXIT` trap; each prints its own residual
count as the last line. `provider-drills.sql` never commits.

## Files

```
README.md                                     this report
drills/provider-drills.sql                    D1-D6, one rolled-back transaction
drills/alert-sig-failures-fire-and-clear.sh   forgery alert: quiet -> fires (exit 1) -> clears
drills/alert-dlq-fire-and-clear.sh            DLQ alerts: quiet -> fire (exit 1) -> clear
raw/                                          verbatim stdout of every command above
```
