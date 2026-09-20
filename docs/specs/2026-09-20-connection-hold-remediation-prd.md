# Connection-Hold Remediation — PRD

**Opened** 2026-09-20 · **Owner** orchestrator · **Status** in progress

## Problem

One API instance serves **at most `DB_POOL_MAX` concurrent authenticated requests** — 10 on AWS RDS
(`db/pool.config.ts:236`). Every authenticated request holds one Postgres connection for its entire
lifetime (`TenantContextInterceptor`). The 11th request queues and gets a **503 after 5s**
(`db/pool-admission.ts`, queue depth `max × 4`).

Handlers that make third-party HTTP calls hold that connection across the round trip. A single checkout
occupies **10% of an instance's capacity for up to 10 seconds** doing nothing but waiting. Postgres sees
`idle in transaction`; `statement_timeout` (30s) cannot fire because no statement is running, so only
`idle_in_transaction_session_timeout` (60s) ends it. There is **no request-level timeout** — the
`REQUEST_DEADLINE_MS` abort signal is context metadata and cancels nothing.

## Closed before this lane

| | Outcome |
|---|---|
| Automation webhook dispatcher | Deleted as a duplicate; consolidated onto `WebhooksDispatchService` (after-commit, chunked, breaker, pinned-DNS SSRF). Capacity **and** security improved. |
| `AllExceptionsFilter` | No longer throws `ERR_HTTP_HEADERS_SENT` on a mid-stream failure. |
| `uncaughtException` | Stops serving, draining via `app.close()`. |
| Boot-time all-orgs sweep | Off the boot path, still ordered after `sync()`. |
| Email inline send | **Deliberately unchanged** — `enqueueAndTry` is durable *and* immediate; 5s budget already bounds it. |

## Acceptance

Each item is done only when: the behaviour change is covered by a test whose **name states the reason**,
the production typecheck is clean, and no regression is introduced outside the known pre-existing set
(103 typecheck errors from missing `fast-check` + another session's `build/`; 11 `organization/` suites
failing at HEAD).

---

## Items

### H1 — Billing checkout releases the connection across the provider call
`modules/billing/core/billing-order-creation.ts`

The code is **already written correctly**: three short `db.transaction` calls with `provider.createOrder()
(10s)` deliberately between them, plus `abandonIntent` / `releaseReservation` compensation. The
interceptor defeats it — `runInTenantTransaction` *joins* an ambient transaction, so the three collapse
into savepoints inside one long request transaction.

Fix: `@NoTenantTransaction()` on the handler + each `db.transaction` becomes `runInNewTenantTransaction`.

⚠ This makes the compensation path **load-bearing** where a rollback currently masks it.
**Write the compensation tests first.**

- [x] H1a — tests pinning `abandonIntent` + `releaseReservation` on provider failure
- [x] H1b — split the transaction, verify no connection is held across `createOrder`

### H2 — Billing marketplace addon order
`modules/billing/core/billing-marketplace.ts:38` — same shape, same 10s budget.

- [x] H2

### H3 — GST e-invoice filing — ✅ DONE

`modules/accounting/compliance/` — shipped after the blocker below was re-examined and found to be
answerable without a live database. Kept in full, because the reasoning that nearly shipped a broken
change is the useful part.

`ComplianceService.fileDocument(orgId, documentType, documentId, adapter)` owns the flow and its
transaction boundaries: one `runInNewTenantTransaction` for the reads (book, decision, acknowledgement
fence, payload), the adapter call inside **no** transaction, one more for the result write and read-back.
It returns a discriminated result so the controller keeps all five distinct error responses.
`submitDocument` then carries `@NoTenantTransaction()`.

**What unblocked it.** The blocker assumed RLS behaviour could only be observed against a live database.
It cannot be observed, but it does not need to be: `42501` happens when a statement runs with no tenant
GUC, and *that* is a structural property. `runInNewTenantTransaction` → `openTenantTransaction` →
`withTenant` sets the GUC and `runWithTenantContext` installs the context the `DRIZZLE` proxy routes
through, so proving no statement escapes those blocks is equivalent to proving no `42501`.
`compliance-filing-connection-hold.spec.ts` runs the **real** primitive against a recording double and
asserts exactly that, plus two transactions opened, `app.organization_id` set in each, and the adapter
called with no context.

Precedent, found while checking `@Idempotent` on the route: `POST /kb/ask` and the two reindex routes hit
this identical problem and `DrizzleCommandFenceStore` was fixed for it —
`command-fence-store-no-ambient-tx.spec.ts` records the live-schema measurement (`no GUC → ERROR`,
`with GUC → passes`). So `@Idempotent` + `@NoTenantTransaction()` was already a proven-safe pairing.

### H3 — the original blocking analysis (kept; its premise about the audit was right, its conclusion was not)
`modules/accounting/compliance/transport/live-irp.adapter.ts:110` — government IRP endpoint, 15s budget,
raw `fetch`, no breaker, no opt-out. The transaction IS held across it.

**Why it is not done.** The audit that proposed a one-line `@NoTenantTransaction()` was wrong on its
central premise: it claimed the compliance reads/writes "already execute outside the ambient transaction"
because they use `this.db` rather than a passed `tx`. `this.db` is the tenant-aware proxy
(`common/tenant/tenant-db.ts:16`) — its `get` trap resolves **every** property from the ambient context,
so those calls are inside the request transaction, and both
`gl_books` and `gl_document_compliance` are RLS-enabled
(`migrations/0591_tenant_isolation_for_unprotected_tables.sql:742,768`).

So the opt-out alone produces `42501` on every filing. Four surfaces need a tenant transaction first:
`books.findDefault`, `compliance.get`, `compliance.payloadForDocument`, and `submitToTransport`'s own
read + write. Wrapping those shared read methods individually would force a new connection on callers
that already hold one — the C2 problem — so the boundary needs a new service method that owns the flow.

`backend/CLAUDE.md` §8 is explicit that mocked tests do not prove an RLS change: "a swallowed 42501
passes every static check."

⚠ **Two errors in the above, both corrected when the item was reopened.**

1. "There is no `ComplianceController` e2e spec" — wrong. `compliance.e2e-spec.ts` exists. It is a
   service-level spec against a real `DATABASE_URL` rather than a controller e2e, so the conclusion
   survived, but the statement as written was false and should have been checked before it was recorded.
2. "This cannot be verified" — wrong, and it was the load-bearing claim. §8's warning is about
   *mocked* tests standing in for RLS behaviour. The change does not depend on RLS behaviour; it
   depends on no statement escaping a tenant transaction, which is structural and testable here. The
   blocker generalised a rule past what it says.

- [x] H3 — shipped, see above

### H3 — carried forward

`compliance-transport.spec.ts` text-scanned for `this.compliance.submitToTransport(` in two places, one
of them a **negative** assertion that AR posting must never reach the transport. Renaming the entry
point would have made that negative pass vacuously, so it now asserts the live name exists before
asserting posting does not contain it.

### H4 — The third webhook dispatcher ✅ KEEP — not a duplicate
`modules/build/core/projects-webhooks-dispatch.service.ts` — a third copy, unaudited. Determine whether it
repeats the transaction-hold / TOCTOU-SSRF defects the automation copy had.
⚠ `build/` carries another session's uncommitted work — **audit read-only, do not edit**.

- [x] H4

### H5 — Only one replica runs the org sweep
The sweep left the boot path but still runs on **every** replica. Needs a lease. No reusable primitive
exists; session-scoped advisory locks over a pool are not safe as-is.

- [x] H5

### H6 — Container heap — ✅ NOT A DEFECT
Closed on inspection, correcting my own earlier framing. `start:prod` is used only by the local runner
(`scripts/run.mjs:21`); the container's flagless `CMD` lets Node 22 size its heap from the cgroup limit,
which is the correct behaviour. The two *should* differ, and no change is warranted.

- [x] H6

### H7 — Ratchet: no outbound network call inside the request transaction
The rule exists in `backend/CLAUDE.md` §4 and nothing enforces it, which is how it drifted at five sites.
Build the gate the way `check:get-route-writes` was built: `--self-test`, vacuity floors, a frozen
baseline, wired into the CI `gates` job. **Recall must be established by a systematic sweep, not by the
five sites already known.**

- [x] H7a — enumeration produced by the gate itself (reproducible), not by an agent
- [x] H7b — the gate, self-tested and bite-checked
- [x] H7c — wired into `package.json` + CI

---

## Out of scope

- **C2 / "move the tenant seam off the request"** — the 2026-09-19 architecture review's top
  recommendation. **It is not implementable as specified**, and the blocker is mechanical, not a matter
  of effort:
  - The tenant GUC is set with `set_config(…, true)` — `SET LOCAL`, cleared on commit. Borrowing a
    connection *without* a transaction means a session-level GUC that outlives the borrow: the next
    borrower of that connection inherits the previous tenant's scope. A silent cross-tenant read that
    passes every static check.
  - Keeping `SET LOCAL` means a transaction per unit of work — and a drizzle query builder is bound to
    the session it was created on, so the proxy cannot rebuild a already-built query against a fresh
    transaction. Intercepting at `.then()` would mean a recording query-builder shim over drizzle's
    whole surface.
  - The consistency argument for the request-long transaction does not exist either way: no isolation
    level is configured anywhere, so it is **READ COMMITTED**, where each *statement* takes its own
    snapshot. The request transaction never provided cross-statement read consistency.

  What it *does* provide is GUC propagation for the 557 service files that open no transaction — which
  is exactly what `tenant-db.ts:7-13` says it is for. So the achievable form of the recommendation is
  what this lane has been doing: release the connection at the call sites that hold it across non-DB
  work, and let a gate hold the line.
- **Exit-code diagnosis** (`137` OOM vs `143` failed probe) needs a running deployment; no manifests live
  in this repo.

## Evidence log

| Item | Result |
|---|---|
| H1a | 7 tests, `billing-order-creation-compensation.spec.ts`. Commit `10806e5aa`. |
| H1b | `@NoTenantTransaction()` + `runInNewTenantTransaction`. Both halves required — the decorator alone leaves the GUC missing, the service change alone opens a SECOND connection while the first is still held. 3 existing billing specs repaired (their `db.transaction` mocks now delegate). Commit `10806e5aa`. |
| H4 | **KEEP.** `ProjectsWebhooksDispatchService` is not a duplicate — it is the best of the three. Durable outbox delivery (not fire-and-forget), one outbox event per delivery so no fan-out, `postSafeWebhook` pinned-DNS, breaker + body limit. Owns `projectWebhooks`/`webhookDeliveries` and a project-scoped `enqueue(tx, …)` that composes inside a caller's transaction. No work required. |
| H2 | `@NoTenantTransaction()` on `addons/purchase`. No DB write follows the provider call and `ai_credit_packs` has no RLS policy, so the opt-out is the whole fix. Both checkout routes pinned by `billing-checkout-connection-hold.spec.ts` incl. an anti-vacuity case. Commit `3c30139b4`. |
| H5 | Behind `CronLeaseService.withLease`, keyed by `CELL_ID` so it dedups across replicas. `CronLeaseService` provided directly by RbacModule (the WorkflowsModule pattern) — no cycle, no 35-file move. Commit `90c00041c`. |
| H6 | **Not a defect.** See above. |
| H3 | **Done.** `fileDocument` owns three phases; `@NoTenantTransaction()` on `submitDocument`. 9 tests in `compliance-filing-connection-hold.spec.ts`, bite-checked by moving one read outside its transaction (fails, names the right property) — note a read moved *inside* the new transaction but issued off `this.db` is NOT a regression, because the proxy routes it to that transaction. Gate route count 3478 → 3477, the opted-out route leaving the scan. Compliance suite 76/76. Commit `4d61f90c9`. |
| H3 side-fix | `compliance-honesty.spec.ts` allowlisted `transport/` with a forward slash, so on Windows `relative()` returned `compliance\transport\…` and the gate guarding "never claim a document was filed" flagged the mock adapter. Failed locally, passed in CI — a platform-dependent gate. Normalised. |
| H7 | `check:request-txn-outbound`. Baseline **3478 routes / 598 controllers / 8 frozen**. Shared scanner extracted to `scripts/lib/route-scan.mjs`; the sibling gate's output is byte-identical before and after, self-test still passes. Bite-checked with a planted `@Post` doing `fetch()` (exit 1, names the route; 0 after removal). Commit `09036acdb`. |

### H8 — the gate was wrong in both directions ✅ DONE

The frozen baseline of 8 was not the true set. Verifying the gate's own output against source found
three defects in it:

| Defect | Effect |
|---|---|
| `Pick<EmailOutboxService, …>` resolved to `Pick` | The walk stopped one hop short. **Both** automation rule-test routes reach `sendEmailOnceDirect` through that shape and read as clean. |
| `registerAfterCommit` / `runOutsideTenantContext` / `void` counted as holds | Eight routes across e-sign, leads and HR reported as holding a connection they provably release first. |
| `seen` was a global visited set | A node explored on one branch at a deep hop blocked a shallower path elsewhere. Now a path-local cycle guard. |

Depth raised 3 → 6, because the two real holds sit at hop 5. New baseline **8 holds, all verified**, and
every frozen entry carries the decision that put it there. A frozen route that stops reaching the
network now fails the gate instead of silently re-freezing. Commit `4e994f3c7`.

**Ten candidates were verified hop-by-hop; two were real.**

| Verdict | Routes |
|---|---|
| TRUE POSITIVE | `automation#testAutomation`, `support-automations#testAutomation` — same six-hop chain, awaited, no opt-out |
| DETACHED (not a hold) | `sign-admin#runExpirationSweep`, `sign-envelopes#send`, `sign-envelopes#voidEnvelope`, `leads#create`, `leads#update`, `employees#onboard`, `employees#onboardBulk`, `leaves#approve` |

`leaves#approve` is the instructive one: `afterApproved` **is** awaited, but `NotificationDispatchService.emit`
detects the ambient context, writes an outbox intent and defers delivery. Awaited ≠ held.

### H11 — a decorator spanning lines hid its own route ✅ DONE

```
@UseInterceptors(
  FileInterceptor("file", { limits: … }),
)
resumeParse(…)
```

The continuation line does not start with `@`, so it matched the handler pattern: the scan named
`FileInterceptor` as the route **and** consumed the pending decorators, so `resumeParse` was never
collected. One bug producing both a false name and a missing route, in **both** gates. Decorator
argument lists are now tracked by paren depth, pinned by a self-test. Commit `9c3fa4bed`.

### H9 — HR webhook deliveries were never stamped ✅ DONE

Not a hold — the opposite. `testSubscription` and `redeliver` fired `attemptDelivery` with `void`, so the
request transaction committed and its connection returned to the pool while `fetch` was still in flight.
The status write then resolved onto that dead `tx` through the tenant proxy. `hr_webhook_deliveries` has
no RLS policy, so this never produced the `42501` that makes the same mistake loud elsewhere — it either
threw into a `void` or issued a statement on a connection another request had since borrowed.

Effect: a webhook that really was delivered stayed `pending`, and the retry sweep sent it **again**.

Fixed with the pattern `webhooks-dispatch.service.ts:61-66` already documents. Commit `f1915defd`.

### Two holds that must NOT be opted out — the opt-out is worse than the hold

Both were audited before being left frozen, and both would have been shipped as one-line "fixes".

**`notifications-dispatch#dispatch`.** `email_outbox` and `email_suppressions` carry *nullable-aware* RLS,
and the outbox row takes its org from the ambient context. With no context the row is written as a
`PLATFORM` row **instead of failing** — the send silently loses tenant attribution, and the suppression
read silently misses org-specific entries. A silent cross-tenant data defect in place of a slow request.

**`feedbucket#createTicketFromAnalysis`.** Splitting it naively creates **duplicate tickets**. The only
guard against a second ticket is `submission.linkedTicketId`, written *after* `createFromFeedback`; today
one ambient transaction makes them atomic. Split them, and a failure between the two leaves a ticket with
no link — and the retry (no `@Idempotent`, no unique constraint) makes another. Needs an idempotency
fence first. Its sibling `analyzeSubmission` also holds the `org_ai_credits` row locked for the whole 60s,
since credits are reserved before the provider call and settled after, both on the ambient transaction.

### H12 — periodic sweeps have no budget ⚠ CEILINGED, not fixed

`forEachOrg` opens one tenant transaction per organisation, sequentially, against a pool of 10. It
already exposes `stopWhen` — consulted **before** each transaction is opened — and `startAfterOrgId` to
resume. **50 periodic sweeps use neither**, including all 38 under `modules/cron/`.

⚠ **The obvious fix is harmful.** Giving `forEachOrg` a default budget would silently truncate sweeps
that have no durable cursor: they restart at the first organisation next tick and the tail is *never*
reached. `for-each-org.ts:40-44` says so in its own words — "Rotating the entry point turns 'eventually,
maybe' into 'within one pass'". A budget without a cursor is worse than no budget. Making `stopWhen`
required is also wrong: it would force a budget onto one-shot administrative callers that legitimately
want every org.

So this is genuinely per-caller work. `check:sweep-budget` holds the ground at 50 in the meantime — a
ceiling that may fall and never rise, not a claim that the 50 are safe. Self-tested and bite-checked with
a planted sweep. Commit `432f0ef2d`.

### H13 — five AI routes now release the connection ✅ DONE

Each read phase commits before the provider call; the call runs in no transaction; the writes open their
own. Commit `690b8f229`.

`kb-from-ticket#draftFromTicket` · `support-kb-engagement#askQuestion` · `support-kb-gap#proposeDraft` ·
`inv-ai-explain#getDigest` · `inv-ai-explain#getSupplierDelayBriefing`

**Use `runInTenantTransaction` with an explicit `orgId`, not `runInNewTenantTransaction`.** The first
reuses an ambient transaction when one exists, so if a decorator is ever removed the service degrades to
today's behaviour. The second forces a new transaction and would open a **second** connection beside the
one the request still holds — worse than the defect. `inv-ai-read-evidence.ts` already documented this;
reusing it beat writing a third variant.

`KbAskService` needed only the decorator — it was already three-phased with explicit orgIds, because
`POST /kb/ask` had been through this before.

⚠ **`inv-ai-explain#getReorderProposal` is deliberately left holding.** `inv-ai-proposal.spec.ts:572`
pins that `InvAiProposalService` injects no `DRIZZLE` and imports no schema table — *"there is no handle
a write could be issued on"*. Splitting its read phase requires exactly that handle. I injected one,
the invariant caught it, and I reverted: a deliberate safety property outranks a capacity win. The fix
is to move the read into `ForecastPersistenceService` / `PoBatchService`, which already own a handle.

`mail#aiInboxSummary` is also still open, for a different reason: `MailService.listMessages` falls
through to a **Gmail/Outlook fetch** when metadata cannot serve the page, so wrapping its read in a
transaction would create a new hold rather than remove one. Mail needs its own lane.

### H10 — the gate is blind to AI provider calls ✅ CLOSED, ceilinged at 24

The gate now sees them. **Two tiers, because the evidence differs:**

| Tier | Rule | Why |
|---|---|---|
| Non-AI outbound | frozen list, **8** | Each entry carries the decision that put it there. |
| AI provider calls | ceiling, **24** | 24 have not been read hop by hop. A frozen entry claiming a decision nobody made is worse than a number. |

A route reaching both is re-walked with the non-AI predicate, so it is reported where the stricter rule
applies rather than counted twice. Bite-checked with a planted controller calling
`invokeTextWithUsage` — exit 1 naming it, exit 0 once given `@NoTenantTransaction()`. Commit `c14abfb30`.

The ceiling also locks in H13: revert any of those five and the count rises to 25 and CI fails.

**The original H10 text is kept below, because the reasoning for not shipping it earlier still holds —
what changed is that a ceiling says something true about 24 unverified routes, and a frozen list does not.**

### H10 — the measurement that found it

The LLM leaves the process through `ChatOpenAI` (`@langchain/openai`,
`ai/core/providers/llm.service.ts:2`), not `fetch`/`axios`. Nothing in `OUTBOUND` matches it, so **every
route that holds a connection across an LLM call is invisible to this gate.**

Reproduce by adding one alternation to `OUTBOUND` in `check-request-txn-outbound.mjs`:

```
|\binvoke(?:Text|Structured|Chat)[A-Za-z]*\s*\(
```

Measured: **8 → 37 routes.** Not shipped, because freezing 29 unverified routes is exactly the
"place to drop a route nobody wanted to think about" the reasoned freeze map exists to prevent.

**Eight verified hop-by-hop, all TRUE POSITIVES, none opted out:**

| Route | Tier |
|---|---|
| `support-kb-gap#proposeDraft` | standard 60s — then 5 more writes on the same transaction |
| `support-kb-engagement#askQuestion` | fast 30s |
| `kb-from-ticket#draftFromTicket` | fast 30s |
| `mail#aiInboxSummary` | standard |
| `comment-drafts#generateDraft` | standard |
| `inv-ai-explain#getReorderProposal` | standard |
| `inv-ai-explain#getDigest` | conditional on `?narrate=true` |
| `inv-ai-explain#getSupplierDelayBriefing` | conditional on vendor-delay data |

⚠ **An opt-out alone breaks all eight.** AI credits are reserved *before* the provider call and settled
*after*, and `runInTenantTransaction` collapses to `fn(ambient.tx)` whenever a context exists — so
reserve, settle, `ai_usage_logs` and every post-call write share the held connection. Remove the
transaction and the next `this.db` call has no GUC. Each needs its service to own three phases, exactly
as H3 did.

The last two were missed even by the widened pattern above, because they call `invokeText` /
`invokeStructured` rather than the `*WithUsage` variants — a reminder that one alternation is not the
fix, the gateway seam is.

`inv-ai-explain.controller.ts` is the clearest case: **5 of its 7 routes reach the gateway, and only 2
carry the opt-out.** `chat-assistant.controller.ts`, by contrast, is clean — 7 of its 9 routes are plain
CRUD and correctly left inside the transaction.

### The 8 frozen routes — the remaining work list

`automation#testAutomation` · `support-automations#testAutomation` · `projects-webhooks#sendTest` ·
`notifications-dispatch#dispatch` · `feedbucket#analyzeSubmission` ·
`feedbucket#createTicketFromAnalysis` · `support-reports#getOverview` · `webhooks#retryLog`

Settled, needing no work: `webhooks#retryLog` (documented in `webhooks-dispatch.service.ts:61-66` as
intentionally reusing the live request transaction, because the log insert must commit with the retry)
and `support-reports#getOverview` (Redis rather than a provider, read-only, 3s cap with a direct-query
fallback).

Blocked on a prerequisite, not on effort: `notifications-dispatch#dispatch` needs outbox scope resolution
fixed first, and `feedbucket#createTicketFromAnalysis` needs an idempotency fence — see above.

The four rule-test / send-test routes are deliberate synchronous pings where the user is shown the
delivery result. Each needs its own product decision about whether that result is worth a pooled
connection, rather than a blanket opt-out.

### H14 — the four frozen send-tests, capped rather than detached ✅ DONE

Decision: keep the synchronous result the user is shown, bound the wait.

| Route | Before | After |
|---|---|---|
| `projects-webhooks#sendTest` | 10s | **5s** |
| `feedbucket#analyzeSubmission` | 60s (standard tier) | **25s** explicit `AbortSignal` |
| `automation#testAutomation` | — | **already 5s**, verified, unchanged |
| `support-automations#testAutomation` | — | **already 5s**, verified, unchanged |

The two rule-tests reach the network through **email**, not a webhook. Their action sends only
`to`/`subject`/`html`, so `rowReproducesSend` is true and `INLINE_SEND_BUDGET_MS` (5s) applies —
the cap this item would have added is already there.

⚠ **That budget is conditional.** `email-outbox.service.ts:195` passes
`reproducible ? INLINE_SEND_BUDGET_MS : undefined`, and `email.provider.ts:298` does
`if (budgetMs === undefined) { await send; return; }`. An email carrying cc, bcc, `replyTo`,
custom headers or attachments therefore gets **no timeout at all**. Deliberate — an outbox row
that cannot reproduce the send must not be retried — but it means "email is bounded at 5s" is
true only for the reproducible shape.

`AiInvokeBaseOpts.signal` already reaches the provider (`resolveSignal` →
`gate.signal` → `invokeStructuredWithImageWithUsage`), so feedbucket needed no change to the
shared AI gateway. The attempts cap and timeout became one `DeliveryBudget` value rather than two
adjacent `number` parameters. Commit `83148d72e`.

### H15 — `landed_cost`: a required role and a declared purpose that nothing resolves ✅ DONE

`INVENTORY_SEAM_ROLES` required `landed_cost` and `INVENTORY_JOURNAL_PURPOSES` declared
`INVENTORY_LANDED_COST`, but **no account seeds that tag and no call site posts that purpose** —
`landed-cost-journal.ts` posts `INVENTORY_ASSET` / `INVENTORY_COGS` / `AP`. `resolveAccountCodes`
queried a seventh role and returned `null` forever; provisioning reported a gap no operator could
close. Four specs red.

Not a missing account — an entry no call site backs, which is exactly what that list's own
docstring forbids. Both removed.

The bridge's `names no purpose it has no call site for` test **hand-listed three names**, which is
how this got in. It now also derives the rule: no purpose may resolve to a role outside the seam
list. Bite-checked by restoring the dead purpose — it fails naming the exact purpose → role pair.
Commit `5e65e7cc0`.

### H16 — the email-caller scan was blind, and red ✅ DONE

Two defects in `notification-delivery-class.spec.ts`:

1. The predicate matched `*EmailService`, so **`EmailSignService` was invisible**. The inventory
   already carried `modules/e-sign/sign-notifications.service.ts`, so the staleness test reported a
   classified file as one that had *stopped* reaching `EmailService` — **the suite was already
   failing**. 38 → 39; no new classification needed.
2. The comment stripper split on `\n` then applied `/\/\/.*$/` per line. On CRLF every line keeps a
   trailing `\r`, which `.` cannot match and `$` then requires end-of-input, so **no line comment
   was ever stripped** and a commented mention counted as a call. The same defect class as the
   `india-compliance` and `ledger-boundary` scans.

Still under-detects by design: `Email[A-Za-z]*Service` reaches 49 files and needs ten
delivery-class decisions from the notifications owner. Commit `bd3c63996`.

### H17 — the CRM mailbox sweep, the worst hold in the tree ✅ DONE

`POST /crm-mailbox/:id/sync` and `POST /crm-mailbox/sync` read a mailbox over the network **inside the
request transaction**. `sweepAll` does it once per mailbox, up to **fifty times on one borrowed
connection** out of a pool of ten.

Invisible to the gate, for the reason recorded below as gap 2.

`sync` is now three phases — one transaction for the row/connection/plan, the provider fetch in none,
one more to accept messages and move the watermark — with the failure path opening its own. Both routes
carry `@NoTenantTransaction()`; `sweepAll`'s due-list read is wrapped because it no longer has an
ambient context. `push()` dropped its `runInNewTenantTransaction` wrapper, which would otherwise have
become exactly the ambient transaction the fetch needed to escape.

`crm-mailbox-connection-hold.spec.ts` runs the real primitive against a recording double: no context
during the fetch, two transactions, the GUC set in each. Bite-checked by moving the fetch back inside a
transaction — two of three fail. The existing sweep spec needed `primeRelocationTrafficTracker`, because
`withTenant`'s `refreshRelocationTargets` issues its own `select` and was consuming the double's call
counter. Commit `8595d784a`.

### H18 — the walk went to depth 8, and three strip defects fell out ✅ DONE

Depth 6 was hiding real holds. At depth 8 the scan surfaced **16 more routes**. Reading every one
produced two real defects and three reasons the gate lies — each now pinned by a self-test case that
fails on the old code.

| Defect | Effect |
|---|---|
| A service arriving as a **method parameter** was never followed | The walk carried only constructor-injected types, so `adapter.submit(payload)` was invisible — **this is what hid H3's own site while it was still a defect** |
| A deferral **named before it is handed over** escaped the strip | `const dispatch = () => …; if (!registerAfterCommit(dispatch)) void dispatch();` — the detacher's argument region is just an identifier. **9 of the 16 were false positives from this alone** |
| A **voided async IIFE** survived | The void strip ended at the first `;`, and an IIFE body is full of them. Now depth-aware, and excluded from matching a `: void {` return annotation |

**Two real holds, fixed at the root:**

- **`HrAutomationEngineService.emit` awaited `runEvent`**, which reaches `callWebhook`. Six routes across
  contracts, exit, probation and termination held a pooled connection across a *customer's* webhook
  endpoint. `emit` already swallowed every error and returned `void`, so no caller could depend on the
  result — deferring changes no contract, and stops rules observing uncommitted state.
- **`exit-write`'s private `deferAfterCommit`** duplicated logic living in three other files, and being
  private it was invisible to any gate. Moved to `common/tenant/defer-after-commit.ts` and named in
  `DETACHERS`. The per-file `Logger.error` channel is kept via `reportDeferred`, because
  `exit-write-deferred-failure.spec` pins that level and message.

**Net: non-AI holds stay at the frozen 8 — now verified at depth 8 rather than 6 — and the AI ceiling
falls 24 → 18.** Two frozen reasons were rewritten: `sendTest` and `analyzeSubmission` are now bounded,
and a frozen entry describing a budget that no longer applies is worse than no entry.

`--explain` prints the hop chain behind each reported route. **Every verdict above came from it**, not
from reading services one at a time — the manual approach had already produced one wrong guess.
Commit `b2ab4f361`.

### H19 — the AI ceiling, worked down 24 → 13 ✅ IN PROGRESS, ceiling holds

Five more routes three-phased the way H3 and H13 established. Commit `3782ec03f`.

| Route | Service | Shape |
|---|---|---|
| `support-ai#translateMessage` · `#translateDraft` · `#improveReply` | `SupportAiTranslationService` | reads → provider → **no writes**, so only the read phase needed wrapping |
| `support-ai#suggestMacro` | `SupportAiTriageService` | reads → provider → writes, two short transactions |
| `support-ai#analyze` | `SupportAiTriageAnalysisService` | same |

⚠ **Three siblings on the same controllers were deliberately left, because their "read phase" is not
one.** `suggestReply` and `generateHandoffSummary` call `searchKbForTicket`; `findRootCauseCluster` calls
`upsertAndSearchSimilar`. Both **embed through the AI gateway partway through the reads**, so wrapping
that phase in a transaction would hold a connection across an *embedding* call — a new hold in place of
the old one. They need the KB search split first: reads, embed, vector query. My own first pass
classified `findRootCauseCluster` as safe because I grepped only for `searchKbForTicket`; the second
helper does the same thing under another name.

**The remaining 13, and what each needs:**

| Blocked on a real constraint | Why |
|---|---|
| `support-ai#suggestReply` · `#generateHandoffSummary` · `#findRootCauseCluster` | embed mid-phase, see above |
| `inv-ai-explain#getReorderProposal` | `inv-ai-proposal.spec.ts:572` pins that the service holds no DB handle |
| `mail#aiInboxSummary` | `MailService.listMessages` falls through to a Gmail/Outlook fetch |

| Tractable, same pattern as above | `comment-drafts#generateDraft` · `chat-summarize#summarize` · `hr-email-templates#generateAi` · `recruitment#aiScore` · `#compositeScore` · `#resumeParse` · `mail#aiDraft` · `mail#aiThreadSummary` |

**Testing note that cost real time:** four specs needed `withDelegatingTransaction` *and*
`primeRelocationTrafficTracker`. The second is not optional — `withTenant` fires
`refreshRelocationTargets`, which issues its own `select`, so a double that counts `select` calls
silently answers the **wrong row**. That is what made a mailbox sweep read `disabled` in H17.

### ⚠ Known recall gaps in the gate — both now closed

Two misses, by construction, both confirmed against real code — **both closed by H18/H17**:
1. ~~**A service arriving as a parameter.**~~ `compliance.controller.ts#submitDocument` reached `fetch`
   via `adapter.submit(payload)`, where `adapter` is a parameter — so H3's own site was invisible while
   it was still a defect. **Closed:** every hop now carries its own parameter types, pinned by a
   self-test that plants a two-file chain and fails on the old walk.
2. ~~**A free function wrapping the client.**~~ `crm-mailbox.controller.ts#sync` reaches Gmail/Outlook
   through `fetchGmailMessages(this.gmail, …)` and then `gmail.listMessages(…)` on a *parameter*, behind
   a Composio client further away than the depth limit. **Closed twice over:** the limit is now 8, and
   the route itself was fixed in H17.

Recall is measured, not assumed. Closing these two does not make it 100% — it makes the two known holes
shut. The gate's baseline was wrong in **both** directions until it was checked against source, and the
depth-8 sweep found 9 more false positives on top of that.

Recall is measured, not assumed, and it is not 100%. A green gate is not a licence to assume the rule
holds — the gate's own baseline was wrong in both directions until it was checked against source.
