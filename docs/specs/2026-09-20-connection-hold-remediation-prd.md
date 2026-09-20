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

- **C2**, separating tenant scope from transaction lifetime, is the deeper fix and touches tenant
  isolation. It follows this lane; it does not join it.
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

### The 8 frozen routes — the remaining work list

`projects-webhooks#sendTest` · `notifications-dispatch#dispatch` ·
`feedbucket#analyzeSubmission` · `feedbucket#createTicketFromAnalysis` ·
`hr-webhooks#redeliver` · `hr-webhooks#test` · `support-reports#getOverview` ·
`webhooks#retryLog`

Several are deliberate synchronous test-pings where the user is shown the delivery result, so each needs
its own decision rather than a blanket opt-out. `webhooks#retryLog` is documented in
`webhooks-dispatch.service.ts:64-66` as intentionally reusing the live request transaction.

### ⚠ Known recall gaps in the gate

Two misses, by construction, both confirmed against real code:
1. **A service arriving as a parameter.** `compliance.controller.ts#submitDocument` reached `fetch` via
   `adapter.submit(payload)`, where `adapter` is a local — so H3's own site was invisible to the gate
   while it was still a defect. H3 is fixed, but the blind spot is not: the next route that reaches the
   network through a local or an injected-at-call-time port will be missed the same way.
2. **A free function wrapping the client.** `crm-mailbox.controller.ts#sync` reaches Gmail/Outlook through
   `fetchGmailMessages(this.gmail, …)`. It really does hold the transaction and the gate does not see it.

Precision is high; recall is not proven. A green gate is not a licence to assume the rule holds.
