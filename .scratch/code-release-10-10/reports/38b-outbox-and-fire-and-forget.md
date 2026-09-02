# 38b — A dropped domain event, and the gate that could not see it

**Scope:** the three findings routed out of ticket 38. Backend repo, branch `main`.
**Status:** all three closed. Two gates rewritten, one domain event returned to service, one
fire-and-forget provisioning path moved onto the transactional outbox.

---

## Finding 1 — `build.ticket.status_changed` was emitted and never handled

### What was actually true

Verified, not assumed:

- `projects-tickets-update.service.ts:296` emits `build.ticket.status_changed` inside the ticket
  update transaction, on **every** status change.
- `build-ticket-status-changed-consumer.service.ts` declares
  `readonly eventType = "build.ticket.status_changed"` and registers itself in `onModuleInit`.
- That class was referenced by **nothing** except its own spec, and was absent from the `providers`
  of `projects.module.ts`. Nest therefore never constructed it, `onModuleInit` never ran, and it
  never reached `OutboxConsumerRegistry`.

The consequence is worse than "the notification is missing". `OutboxPublisherService.deliver()`
throws when the registry has no consumer:

```
no dispatch handler for event type 'build.ticket.status_changed' — register a consumer via OutboxConsumerRegistry
```

so every ticket status change wrote a row that retried on the exponential backoff and was
**dead-lettered** after `OUTBOX_MAX_RETRIES` (8). The outbox was doing its job perfectly; there was
nothing on the other end.

### Was it dead code instead?

Checked before concluding anything, because deleting the emitter would have been the other
plausible reading:

- `notification-events-build.catalog.ts:25` registers `build.ticket.status_changed` as a real
  notification event with a template ("Task status changed").
- `common/region/cross-cell-events.spec.ts:28` names it in the cross-cell event set.
- Its sibling `BuildReleasePublishedConsumerService` is byte-for-byte the same shape and **is** a
  provider on line 82 of the same module.

The event is intended to be live and the consumer is complete. This was a missed line in a module
file, not dead code. **Fix: register it.** Two lines in `projects.module.ts`.

### The more dangerous half — the gate certified delivery it could not observe

`check:outbox-consumers` reported green (25 emitted / 28 consumed) because it answered
"is this event type consumed?" by string-matching a `readonly eventType = "..."` literal *anywhere*
in the tree — including inside the orphan file itself. That is a property of a **file**, not of a
**running system**. A class no module provides satisfies it perfectly.

The gate now checks registration. A consumer counts only when all three hold:

1. it declares an event type (`readonly eventType`, or an inline `registry.register({ eventType })`);
2. its class appears in the `providers` of some `@Module`;
3. that module is reachable from `AppModule` by following `imports` — backend/CLAUDE.md §1,
   "a new module is not wired until it is registered in `app.module.ts`".

Module imports resolve through each file's **own import statements**, so the two distinct
`OrganizationModule` classes in this repo cannot be mistaken for one another. Test files are
excluded from the corpus entirely: a consumer that exists only in a spec must not clear a real
emission, and a spec that merely *mentions* the shape must not read as a declaration.

### Proof that the new gate bites

| Tree state | `node src/scripts/check-outbox-consumers.mjs` |
|---|---|
| `BuildTicketStatusChangedConsumerService` removed from `providers` | **exit 1** — names the event, the emitting file and the unregistered class |
| re-added to `providers` | **exit 0** |

### Re-run over every emitted type — was it blind to others?

It was blind to exactly **one**, and proving that took a correction worth recording.

The first registration-aware run reported **seven** orphans. Six of them were **my own parser's
false positives**: `build.module.ts`, `kb.module.ts`, `finance.module.ts`, `hr.module.ts` and
`inventory.module.ts` hoist their children into `const BUILD_MODULES = [...]` and write
`imports: BUILD_MODULES`, and the parser only understood `imports: [`. Those five subtrees read as
unreachable from `AppModule`. I checked each flagged consumer against the module files by hand
before believing the gate, found all six genuinely registered, and fixed the parser to resolve
array-const indirection and spreads. Both shapes are now pinned by self-tests.

Had I trusted the gate's first output, six correctly-wired consumers would have been "fixed".

**Final measured state — 26 emitted / 29 registered / 0 orphans, exit 0.** (26 rather than 25
because Finding 2 adds `organization.setup.completed`; 29 registered exceeds 26 emitted because
`expense.submitted`, `expense.decided` and `kb.content.delete` have registered consumers whose
producers do not go through `OutboxWriter.emit` — consumed-without-emitter is not a defect.)

---

## Finding 2 — org provisioning ran in a bare `setImmediate`

`org-setup.service.ts` did four things after the setup transaction committed — seeded RBAC roles,
provisioned module checklists, closed the onboarding session, sent the welcome email — inside
`setImmediate(() => void runOutsideTenantContext(...).catch(log))`, with the results collected by
`Promise.allSettled` and every rejection written to a log line.

A process restart in the window between the commit and the callback, or any single step throwing,
left a **brand-new organisation permanently half-provisioned**. With the role seed lost, the owner
could not open the screens they owned, and nothing anywhere recorded that it had happened.

### Which of the three mechanisms applies

backend/CLAUDE.md §4 names three and picks between them by what a crash costs.
`registerAfterCommit` is for work "recoverable from state already stored" — the worked example is a
blob upload whose row already carries the key. That is not this: losing the role seed is a
correctness bug with no other record of the intent, and the welcome notification leaves the
process. That is mechanism **(2), the transactional outbox** — the event commits with the aggregate
and a relay retries it.

### What changed

- `OrgSetupService` emits `organization.setup.completed` via `OutboxWriter.emit(tx, …)` **inside**
  the same `runInTenantTransaction` that stamps `onboarding_completed_at`, in both `completeSetup`
  and `skipSetup`. The intent cannot commit without the org, or the org without the intent.
- `OrgSetupCompletedConsumerService` performs the work, fenced by `InboxConsumer` and registered in
  `OrgModule`'s providers.
- The steps run **in sequence, and a failure rethrows**. The inbox row is marked `FAILED` (so it
  stays reclaimable), the error reaches `OutboxPublisherService`, the event is retried and finally
  dead-lettered where the dead-outbox alert reports it. Failure is observable instead of logged and
  dropped. Every step is idempotent under redelivery: `seedSystemRolesForOrg` never rewrites an
  existing role's grants, the checklist and session calls are ensure-shaped, and the welcome
  notification carries `outboxEffectIdempotencyKey`.
- Two further floating promises removed: the duplicated
  `void withIdentity(...).catch(log)` writes to `account_organization_index` are now one awaited
  `touchAccountOrgIndex` helper. That timestamp is genuinely cosmetic and rewritten on the next org
  switch, so it stays non-fatal — but it is now awaited inside the request that causes it rather
  than racing it.

Delivery rides the same `/cron/outbox-events-worker` relay as the 25 other durable event types in
this repo, so org setup now shares the delivery path of `build.release.published`, `deal.closed`
and `sign.envelope.completed` rather than having a private one.

### The test that fails if the work goes back

`__tests__/org-setup-durability.spec.ts` asserts the service source contains no `setImmediate`,
`setTimeout`, `process.nextTick`, `queueMicrotask` or `void <call>`; that the event is written
through the **transaction handle** and never the bare `db`; and that the consumer is a provider of
`OrgModule`. `__tests__/org-setup-completed-consumer.service.spec.ts` covers the consumer's
behaviour including that a failing step **rethrows** rather than being swallowed.

Mutation-checked, not assumed: reintroducing a `setImmediate(() => { void … })` into
`org-setup.service.ts` turns the suite red — **2 failed, 8 passed, exit 1** — and reverting returns
it to green.

---

## Finding 3 — a gate that printed findings and exited 0

`check:fire-and-forget` covered exactly two method names (`emit`, `savePosition`) inside
`src/modules`, then **printed ~49 uncovered method names totalling 39+ call sites and exited 0**.
The output looked like diligence while the number was free to climb. That is the failure mode the
script's own comment had already identified in `check:ai-charge` and then reproduced.

Rewritten into two tiers:

- **TIER 1 — banned, zero tolerance.** The original dispatch/checkpoint shapes. Currently **0**.
- **TIER 2 — ratcheted.** Every discarded promise (`void x.y(`, including bare calls and deep member
  chains) and every swallowed rejection (`.catch(() => undefined | null | {} | void 0)`,
  `.catch(noop)`) across **all of `src`** — not just `src/modules`, and no longer excluding
  controllers, guards, interceptors and filters, where a floating promise is just as dangerous.

Corpus widened from 1,839 files / 2 method names to **3,574 files / every shape the scanner can see**.

**Ratchet set at the measured current number: 283** — written next to the constant with its date and
its decomposition (200 floating promises + 83 swallowed rejections, measured 2026-09-02). It is not
a target and not an approval of those 283 sites; it is the line held. A run that comes in *under* it
prints the number to lower it to, so the pin cannot quietly rot. No finding was baselined away to
turn something green — Findings 1 and 2 were fixed, and the 283 are named, counted and reported on
every run.

`registerAfterCommit` (54 calls) is **inventoried, not ratcheted**, with the reason stated in the
script: backend/CLAUDE.md §4 names it a sanctioned mechanism, so its count measures adoption rather
than debt.

The script also states what it still **cannot** see, so a green run is not read as more than it is:
an async call with neither `await` nor `void` (needs type information), `.then()` with no rejection
handler, and a `catch` block whose body only logs — which is precisely how `org-setup.service.ts`
hid four steps of provisioning, and which no regex distinguishes from a legitimate one.

**Proof it bites:** adding one `void this.sessions.completeSession(...)` moves the count to 284 and
the gate exits **1**, naming the heaviest files and the most common discarded methods; reverting
returns it to 283 and exit **0**.

---

## Commands run

| Command | Exit | Number |
|---|---|---|
| `$HEAVY 2 -- pnpm -C streamlineos-backend typecheck` | 0 | 0 TS errors |
| `pnpm -C streamlineos-backend check:spec-typecheck` | 2 | 1 error, **not mine** — see below |
| `$HEAVY 2 -- … jest --runInBand --testPathPattern="(modules/build\|modules/organization\|common/outbox)"` | 0 | 172 suites / 1044 tests passed |
| `$HEAVY 2 -- … jest --runInBand --testPathPattern="(modules/organization/setup\|modules/build/core\|common/outbox)"` | 0 | 67 suites / 333 tests passed |
| `pnpm check:outbox-consumers` | 0 | 3,551 files · 215 modules · 1,202 providers · 26 emitted / 29 registered / 0 orphans |
| `pnpm check:outbox-consumers:self-test` | 0 | 30 assertions passed |
| `pnpm check:fire-and-forget` | 0 | 3,574 files · tier 1 = 0 · tier 2 = 283 (ratchet 283) · 54 `registerAfterCommit` |
| `pnpm check:fire-and-forget:self-test` | 0 | 18 assertions passed |

Bite proofs (mutation-tested, each reverted):

| Mutation | Exit |
|---|---|
| consumer removed from `projects.module.ts` providers | 1 |
| consumer re-added | 0 |
| `setImmediate` reintroduced into `org-setup.service.ts` | 1 (2 failed / 8 passed) |
| one extra `void this.x.y(` added | 1 (284 vs ratchet 283) |

### `check:spec-typecheck` — the one red line, and why it is not mine

The first run reported two errors. One **was** mine and is fixed:
`org-setup-tenant-isolation.spec.ts:88` constructed `OrgSetupService` with 7 positional arguments
after I reduced the constructor to 5 — a textbook case of the repo's own trap, since ts-jest runs
`isolatedModules` and the spec passed jest while failing `tsc`.

The one that remains is **outside my territory and outside my diff**:

```
src/modules/gdpr/gdpr-erasure-chat-attachments.spec.ts(213,27): error TS2493:
Tuple type '[]' of length '0' has no element at index '0'.
```

`git diff HEAD --stat -- src/modules/gdpr/` shows `gdpr-subject-erasure.service.ts` and
`gdpr-subject-erasure-authored-content.ts` modified in the shared working tree by another agent.
The spec breaks against that uncommitted change. Routed, not touched.

---

## Files changed (backend)

```
src/modules/build/core/projects.module.ts
src/modules/organization/setup/org-setup.service.ts
src/modules/organization/setup/org.module.ts
src/modules/organization/setup/org-setup-completed-consumer.service.ts          (new)
src/modules/organization/setup/dto/org-setup-completed-payload.schema.ts        (new)
src/modules/organization/setup/org-setup-tenant-isolation.spec.ts
src/modules/organization/setup/__tests__/org-setup-durability.spec.ts           (new)
src/modules/organization/setup/__tests__/org-setup-completed-consumer.service.spec.ts (new)
src/scripts/check-outbox-consumers.mjs
src/scripts/check-fire-and-forget.mjs
```

No `package.json` edit was needed — both gates and both `:self-test` variants were already wired.

---

## Cross-territory findings

1. **`check:spec-typecheck` is red on `gdpr-erasure-chat-attachments.spec.ts:213`** from another
   agent's uncommitted `gdpr-subject-erasure*` changes. Not mine; not touched.
2. **The blindness pattern is probably not unique to this gate.** `check:outbox-consumers` proved a
   *string* existed and reported it as a *wiring*. Any `check:*` script that greps for a declaration
   rather than resolving a graph can certify something it cannot observe. The module-graph walker in
   `check-outbox-consumers.mjs` (`analyseSources`, `isRuntimeSource`) is reusable for any gate that
   needs "is this class actually registered".
3. **Two `@Injectable`s absent from `IngressModule`** — ticket 38's own routed item 6
   (`telephony-call-log.service.ts:83`, `whatsapp-ingress.service.ts:108`) is the same class of bug
   as Finding 1 and would be caught by a registration-aware gate generalised beyond the outbox.
4. **283 tier-2 sites remain**, pinned but unexamined. The ones whose effect leaves the process are
   the candidates for the outbox; ticket 38's report §7(c) already names several.
