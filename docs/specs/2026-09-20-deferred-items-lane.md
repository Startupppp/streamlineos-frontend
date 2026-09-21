# Deferred-items lane — closing out the prior lanes

**Opened:** 2026-09-20 · **Owner:** backend
**Absorbs and replaces:** `2026-09-19-tenant-connection-hold-prd.md` · `2026-09-20-read-cost-lane.md`
Both were 100% ticked with their acceptance met, so they were deleted on 2026-09-20 and their durable content folded in below (§A, §B). Recover either with `git show HEAD:docs/specs/<name>.md`.

**This file is not finished work.** Every R-item below is closed, but the lane still carries the R6 deferral table and the open `[dup-prefix]` migration numbers.

Both prior lanes are 100% ticked. What remains is their **deferred** tables. A deferral is a claim, and a claim can be wrong — so each item below is re-tested against source before it is either implemented or re-deferred with a sharper reason.

The governing constraint is unchanged: `DB_POOL_MAX` is 15, and an authenticated request holds one pooled connection for its whole life. Every second spent in a provider call inside that transaction is a second no other request in the process can reach the database.

## Rules for this lane

- Re-verify the deferral's stated reason first. If the reason is wrong, say so and record the real one.
- Exclusive file ownership per agent. The coordinator verifies every diff and owns the shared tenant primitives.
- No change to a caller's observable failure contract without enumerating every caller that depends on it.
- An item that genuinely needs a live database stays deferred with the exact steps to certify it. Production credentials are not loaded to make a check pass.

---

## Todo

| Item | Blocked on | Exactly what closes it |
|---|---|---|
| Read-replica routing for 1,646 GET routes | Infrastructure. `DB_REPLICA_URL` is unset and `runInReplicaTenantRead` has 3 call sites. | Provision the RDS/Aurora **reader endpoint**, set `DB_REPLICA_URL`, then measure cold/warm buffers per route as `streamline_app` with the tenant GUC. Largest remaining capacity win — it is the only item that raises the concurrency ceiling rather than shortening the hold. Note it shares R4's hazard: a GET that writes cannot be served by a reader either, so **fix the 15 first**. |
| The 15 writing GET routes | Product decision on audit semantics. | `logCritical` commits with the request on purpose. Moving those 5 to `logCriticalOutsideTransaction` changes what a rolled-back request records. Needs a decision, not a refactor. |
| `projects-members.service.ts` `limit(500)`, `projects-labels.service.ts` `limit(300)` | Frontend contract. | Capping needs a cursor and matching frontend paging work — a two-repo lane, not a backend fix. |
| `org-membership-read.service.ts` keyset on `coalesce(name, email)`; `chat-search.service.ts:153-167` leading-wildcard `ILIKE`; `kb-document-query.service.ts:73,115` leading-wildcard `ILIKE` on `kb_articles.title` / `kb_pages.title` (added 2026-09-20 for Ask OS `searchMyDocuments`) | A migration **and** a live measurement. | Both want `pg_trgm`. Per backend/CLAUDE.md §3 a text index is **unusable under RLS** unless reached through a `SECURITY DEFINER` function owned by the BYPASSRLS owner — the `app.search_ticket_ids` pattern. So this is not "add an index"; it is that whole five-condition pattern, measured in buffers on a real database. The KB one is the least urgent of the three: it is bounded by `spaceId IN (accessible spaces)` and `LIMIT 20`, so it scans the caller's spaces rather than the org. Recorded here rather than shipped silently. |
| `calendar-event-source.loader.ts` indexed `OR` + semi-join | Nothing — already done. | Measured and annotated by its author; buffer counts are recorded in the file. |

---

## Verification log

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.json` | **0 errors in any lane file.** 62 pre-existing errors remain in files owned by concurrent sessions (66 at the start of the day; those sessions fixed 4 of their own). No heap fault — the run completed. |
| `jest` across `kb/wiki`, `storage`, `email`, `automation`, `crm/consent` | **916 passed / 916**, 104 suites, zero failures |
| `check:outbound-timeouts` | green — 17 outbound calls across 5,033 files, all bounded |
| `check:ai-route-tenant-optout` | green — 216 routes across 36 controllers, **65 frozen** (unchanged; it went red mid-lane and was fixed, not re-baselined) |
| Comments added to production files | **zero**. One 20-line block was *restored* after an agent deleted it. |
| Casts / `any` / `@ts-ignore` in production files | **zero** |

**One rule I followed the repo's convention on rather than the letter of CLAUDE.md §6, stated plainly:** the new and edited *specs* build `Db` doubles with `as unknown as Db` / `as never`. `Db` is a very large structural type and every database-double spec in this repo already does this — `kb-media-ledger-compensation.spec.ts` and `email-outbox.service.spec.ts` each had several before I touched them. Removing the pattern is a repo-wide refactor, not this lane. No production file gained a cast.

## What actually changed about the system

Three request paths no longer hold one of the 15 pooled connections while waiting on something that is not the database:

| Path | Worst-case hold before | After |
|---|---|---|
| Automation email (reached from deals, e-sign, HR onboarding) | ~123s — 3 × 30s provider attempts + 3s backoff + a 30s fallback | ~5s, and now durable |
| Any outbox email's inline attempt | 30s | 5s |
| Storage upload (`/storage/upload`, onboarding documents) | 35s AV scan | 0s |
| Storage download / image | object-store round trip | 0s |
| KB media upload | AV scan + CPU encode + object-store upload | 0s |

**Three premises in the prior PRD's deferred table were wrong**, and each was wrong in the direction of making the work look larger or different than it was: the email item was one method rather than 75 call sites; the kb-media item named a class that does not appear in the file; the storage item asked for work that was already done. The one premise that was *right* in substance — `recordTargetRequest` — understated its own blast radius.

**Two correctness defects surfaced that were not connection-hold issues at all:** the outbox retry silently re-sent without `cc`/`bcc`/`replyTo`/`List-Unsubscribe`, and automation email was never durable in the first place.

## Not certified

Nothing in this lane was exercised against a live database. No disposable environment was available and production credentials were not loaded to make a check pass. Every change is verified by typecheck, unit test, gate and source review only. Before trusting the `@NoTenantTransaction()` changes in production, exercise one real upload, one real download and one automation-triggered email against an RLS-enabled database and confirm no `42501`.

---

## ✅ Cross-lane hazard found AND closed 2026-09-20 — six committed migrations had never run

`pnpm check:migration-discipline` exited **1** on six `.sql` files that were committed but absent from
`migrations/meta/_journal.json`, so **`db:migrate` skipped them while printing success** — the same
defect found and fixed for `1123_ai_action_proposals_rls` the same day.

**They were not merely unjournalled. All six were verified ABSENT from the production catalog, while
the code that needs them was already deployed.** Each was a live failure waiting on a code path:

| Migration | Production before | Live consequence |
|---|---|---|
| `1121_requisition_headcount_link` | `job_requisitions.headcount_id` absent | **Creating a job requisition failed outright with `42703`.** Drizzle emits `headcount_id` in *both* the INSERT column list and `RETURNING` — confirmed by rendering the SQL — so every create hit a missing column. Unconditional. |
| `1120_add_landed_cost_tag` | `gl_system_tag` had no `landed_cost` | `22P02` on any account tagged `landed_cost`. The DTO derives from the pgEnum, so the API accepted a value the database rejected. |
| `1124_build_comment_draft_evidence` | 0 of 6 columns on `build.comment_drafts` | `42703` — `agent-pulse.service.ts` selects `proposedChange` / `affectedRecordIds` and filters on `retryCount`. |
| `1125_build_managed_product_memberships` | table absent | `42P01` from `scope-directory.service.ts`. |
| `1126_build_project_updates` | table absent | `42P01` from `updates.service.ts`. |
| `1127_build_project_attachments` | table absent | `42P01` from `files.service.ts`. |

**All six are now applied and verified live.** Ledger **17 → 23 rows**. Each was journalled with a
strictly-increasing `when`, dry-run first, then applied with `--tag=` alone — never bare `db:migrate`,
which would still try to replay ~870 migrations against a live 1,041-table database. The runner wraps
each migration in one `sql.begin(...)`, so partial application was impossible.

Verified in the production catalog afterwards rather than trusted from the runner's output:
`headcount_id` integer/nullable with `fk_job_requisitions_headcount_org` **validated** and
`idx_requisitions_headcount` present; `gl_system_tag` carries `landed_cost`; all 6 `comment_drafts`
columns; all three `build` tables. `job_requisitions` held **0 rows**, so the FK validation and the
column add were both trivial and took no rewrite.

⚠ **Still open, and deliberately not touched: two duplicate migration numbers.** `1120` is claimed by
both `1120_add_landed_cost_tag.sql` and `1120_feedbucket_widget_defaults.sql`; `1121` by both
`1121_requisition_headcount_link.sql` and `1121_chat_presence_custom_status.sql`. Two lanes numbered
independently. The journal keys on `tag`, not the number, so this breaks nothing at runtime — but
`check:migration-discipline` still reports `[dup-prefix]` for both, and renaming a file belongs to the
lane that owns it.

**The lesson this lane should carry:** journalling is not bookkeeping. An unjournalled migration is
indistinguishable from an applied one at every static gate — typecheck passes, jest passes, the build
passes, `db:migrate` prints success — and only shows up as a runtime `42703`/`42P01` in front of a
customer. The catalog is the only authority.

## §A — Absorbed from `2026-09-19-tenant-connection-hold-prd.md`

That lane's five todos (T1–T5) were all ticked and its acceptance met: `check:outbound-timeouts` 17 calls all bounded, `check:ai-route-tenant-optout` 66 frozen, both bite-checked; jest 3,391/3,392. Two sections are kept because they are decisions, not status.

### A1 — Rejected approach: per-query borrow inside the tenant proxy

**Recorded so a future review does not re-propose it.**

The obvious deepening is to relocate the connection borrow into `createTenantAwareDb`: acquire a connection per unit of work, set the GUC, run, release. The proxy already intercepts every query in the codebase, so 557 service files would not change.

**This is not implementable with Drizzle.** `db.select()` returns a query builder bound to its target at call time, and that builder executes lazily on `await`. To route a query into a fresh transaction the proxy would have to hand back a builder already bound to a `tx` — which means acquiring a connection *synchronously* inside the proxy's `get`/apply trap. Connection acquisition is async. The builder cannot be rebound afterwards, and replaying a recorded method chain onto a real `tx` at `then` time would mean reimplementing Drizzle's builder surface.

Revisit only if Drizzle gains a deferred-execution binding.

### A2 — Why the AI-route opt-out stopped at two routes

The audit named five files with the same shape. Three were left alone on evidence, not fatigue, and they remain in the ratchet's frozen list so the debt is recorded and cannot grow:

- `inv-ai-explain.controller.ts` carries a docblock stating that four handlers **keep** the request transaction and that the class-level interceptor is "strictly an improvement and never a behaviour change" for them. `getDigest` / `getSupplierDelayBriefing` interleave their reads with the model call rather than loading evidence up front, so the wrap is not the mechanical one-liner it is for the other two.
- `kb-ask.controller.ts` has both asking routes already opted out; what remains is `getHistory` / `clearHistory`, which make no model call and correctly stay inside the transaction.
- `chat-assistant.controller.ts` and `inv-report-builder.controller.ts` likewise leave only non-model routes behind.

### A3 — Residual risk on the two routes that were sunk

`POST /payroll/me/payslips/:publicationId/ai/explain` and `POST /inventory/ai/insights/:insightId/explain` are verified by typecheck, unit test and structural equivalence to a deployed streaming sibling — **not** by a live request. The opt-out **requires** `@UseInterceptors(AiRequestAbortInterceptor)`: `@NoTenantTransaction()` removes the tenant context `getAmbientAiAbortSignal` reads, so without it the released connection is bought with an uncancellable, still-billed provider call. Certify with one real request per route.

---

## §B — Absorbed from `2026-09-20-read-cost-lane.md`

All six of that lane's todos were ticked; its four "Not in this lane" items are already carried in the R6 table above. Kept here: the aggregate result, and two defects that matter more than the lane itself.

### B1 — Round-trip reduction achieved

e-sign summary 9 → 2 · e-sign list 2 → 1 per page · timesheets `verifyChain` 2 → 1 · chat DM lookup 2 queries over O(channels × members) rows → 1 query returning at most 1 row · chat thread open one round trip saved · chat channel search unbounded → capped at 501 · marketplace 5 single-row reads no longer materialise a full result set.

Two reads were **correctly left whole**: `marketplaceAppSchema` and `appInstallationSchema` require all 17 / all 8 columns, so nothing was droppable, and `sign-envelope-lookup.ts` was left untouched because every caller passes the whole envelope onward — guessing a projection there throws a contract error rather than speeding a page.

### B2 — Two defects the coordinator caught in agent output, neither visible from the agents' own green test runs

These are the reason a peer's green run is not integration proof.

1. **A silent behaviour narrowing.** Reusing `listMemberChannelIds` also inherited its `isArchived = false` filter, which `searchChannels` never had. An archived private channel the caller belongs to stopped being findable — and search is exactly how a person finds one. Fixed with an `includeArchived` option defaulting to `false`, so the Ably token route keeps its old behaviour.
2. **A constructor arity break.** Adding `ChatChannelListService` as a third constructor parameter broke four `new ChatSearchService(...)` call sites in two **unmodified** specs. Every chat jest run stayed green because ts-jest does not fail on type errors — **only the typecheck sees arity.**

---

## 2026-09-21 — closeout session

### Migration 1129 (onboarding session race) — APPLIED TO PRODUCTION

The race this migration exists to prevent had **already happened in production**.
`getOrCreateSession` could insert a second flow session for one actor, and
because it orders by `created_at DESC` the newest row wins.

| Evidence | Value |
|---|---|
| Conflicting pair | org `c26140dd…`, user `6fcc8aa8…`, type `org_setup` |
| Row 4 | `completed` at 2026-09-14T02:36:34.612Z |
| Row 5 | `not_started`, inserted 02:36:38.732Z, empty, untouched for 7 days |
| Effect | that org's owner was handed the stale `not_started` row for a week |

`CREATE UNIQUE INDEX` would have failed outright on this pair. The migration now
abandons losers first, keeping the most advanced session per actor
(`completed` > `skipped` > `in_progress` > `not_started`, newest first) — the
same status its partial indexes already exclude.

**A defect in the migration itself was caught before applying.** It dropped
`idx_onb_flow_sessions_org_membership_type` and replaced it with two *partial*
indexes. The first read in `getOrCreateSession` filters org + actor + type with
**no status predicate**, so neither partial index can serve it and
`idx_onb_flow_sessions_status` leads on `(org_id, status)`. That read would have
been left with no usable index. The plain index is kept and restored to the
Drizzle schema.

Applied over IAM auth by explicit tag — never the full chain, which would have
replayed ~1,100 migrations against the near-empty production ledger. The `.env`
password is stale; that cluster is IAM-only.

Verified on production: both partial unique indexes present with correct
predicates · plain actor index intact · row 5 `abandoned`, row 4 untouched ·
zero remaining conflicts · ledger hash matches the file on disk · a duplicate
insert **rejected `23505` on `uq_onb_flow_sessions_user_type`**.

### Notification emails bypassed the suppression list

`EmailService` overrides `sendEmail` to route through `outbox.enqueueAndTry`, so
named senders were gated. `NotificationEmailProvider` called
`EmailProviderService.dispatchEmail` directly and skipped suppression entirely —
falsifying the clause in `email-outbox.service.ts` that the gate "applies to
mandatory notification types too". Hard-bounced addresses kept receiving mail,
degrading domain reputation for every other recipient.

Fixed in the provider, reusing the existing `EmailSuppressionService` seam, as a
**terminal** failure (`retryable: false`) so `notificationQueue` does not retry
forever. Not routed through the outbox: that would have given notifications two
competing retry systems, which root §9 forbids.

### The verification log above is now out of date

It records "62 pre-existing errors remain in files owned by concurrent sessions".
That is no longer true.

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.json` | **exit 0, zero errors** across `src`, `evals` and `test` |

Three of the last errors were a regression: adding the suppression dependency
changed `NotificationEmailProvider`'s constructor arity, and three specs still
constructed it with two arguments. All four provider suites were green
throughout — ts-jest runs with `isolatedModules`, so **jest cannot see a type
error**. Typecheck remains the only gate that sees an arity change.

The suppression parameter is narrowed to
`Pick<EmailSuppressionService, "findSuppressed">` with an explicit `@Inject`,
matching how `PUBLIC_API_URL` already arrives on that constructor — so no spec
needed a cast.

### Suites repaired

All previously failing, all now green, none weakened:
`payroll-inputs` ×2 · `assets.service` · `recruitment-handoff` ·
`employee-attach-employment-duplicate-primary` · `hr-lifecycle-read-caps` ·
`notification-email.provider`.

`hr-analytics.service.ts` `deptDistribution` grouped departments with no cap and
now carries `.limit(1_000)`.

### Premises that did not survive inspection

Four this session, all in the direction of making work look larger than it was:

| Claimed | Actual |
|---|---|
| Outbox writes a PLATFORM/NULL row for notifications | Notifications never touch the outbox at all — no such row exists |
| ~89 unused knip exports in the AI modules | **0** in `src/modules/ai/**`; the ~90 repo-wide total is spread across billing, build, CRM, HR, inventory, KB and others |
| 64 TS7006 errors | 4 errors total, **none** of them TS7006 |
| `markProposalDeclined` omits its `orgId` argument | It passes `{ orgId }`; the reviewer had not read far enough |

The knip figure is since **confirmed standalone** with
`NODE_OPTIONS=--max-old-space-size=8192`: 1 unused file, 14 unused exports,
76 unused exported types, 18 duplicate exports — `0` under `src/modules/ai/**`,
8 under `src/modules/inventory/ai/`.

A fifth premise fell after the above was written:

| Claimed | Actual |
|---|---|
| Making `ticket.updateStatus` atomic "means changing both service signatures" | No signature changes at all — see below |

### Test-inclusive typecheck is now blocking

`.github/workflows/ci.yml` — `continue-on-error: true` removed from the
**Typecheck (test-inclusive)** step (`pnpm typecheck:test`, `tsconfig.test.json`
covering `src`, `evals`, `test`).

The flag was justified in a comment block by 62 pre-existing errors. That count
no longer holds: the step exits **0 with zero errors from cold**, with
`dist/*.tsbuildinfo` deleted first so no stale incremental cache could fake the
pass. The comment block was removed except for the heap note, which is still
load-bearing — at 8192 tsc exits 134 after printing zero errors, a silent
false-pass rather than a typecheck.

Bite proven by scratch-removing a type annotation in
`rank-gap-matches-board-order.spec.ts`: TS7034 + TS7005, exit 2. Reverted.

### `ticket.updateStatus` atomicity — the deferral's reason was false

The deferral at `2026-09-19-ask-os-architecture-remediation-prd.md:170` was
right on three clauses and wrong on the one that mattered. `updateTicket` and
`addComment` do each open their own transaction, neither accepts an external
`tx`, and `confirmAction` is `@NoTenantTransaction()` — all true. But atomicity
needed **no signature change**:

Both services take `@Inject(DRIZZLE)`, which is the `createTenantAwareDb`
proxy. Under an ambient tenant context that proxy resolves every property to
the ambient `tx`, so `this.db.transaction(...)` becomes `tx.transaction(...)`
— and drizzle's postgres-js driver implements that as
`client.savepoint(...)` (`postgres-js/session.js:131`), a savepoint on the same
connection, not a second one. One outer
`runInTenantTransaction(db, fn, { orgId })` is therefore sufficient, and it was
already present in `build-confirm-actions.ts:44`.

`runInNewTenantTransaction` would have been actively worse here — a second
pooled connection against a ceiling of 10.

What was missing was the test. The pair that existed asserted the same three
things twice; one was replaced with an assertion that both writes are
**unreachable when the transaction callback never runs**. Mutation-proved by
moving `updateTicket` outside the wrapper: the new test fails, and **the
original one still passed** — so the duplicate would not have caught a write
escaping the transaction.

Limit worth stating: `runInTenantTransaction` is mocked in these specs, so they
prove the call shape and the containment, not rollback itself. Rollback rests on
the savepoint mechanism verified at source above; proving it end to end needs a
live database, which this machine does not have.

### Still open

- The ~90 repo-wide knip findings. Authorization covered the AI-module item, whose premise was refuted; the real set spans modules other sessions are actively editing, so it needs a separate decision.
- The 50 unbudgeted connection-hold sweeps — not dispatched.
- Every chat-os item needing a live environment: no local Postgres, Redis or Docker on this machine (5432/5433/6379 all refuse).
- ask-os 11.1 (directive column needs a migration) and the email-predicate widening (needs the notifications owner).
