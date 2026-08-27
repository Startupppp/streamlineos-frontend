# Session 3 — Placement (Phase 1)

**Read in this order, then act.**

1. [`PROTOCOL.md`](PROTOCOL.md) — binding. Especially §1 (ask everything now) and §2 (a checkbox is evidence).
2. Root `CLAUDE.md`, then `backend/CLAUDE.md`.
3. Your six tickets in full: [`../issues/`](../issues/) files `20` through `25`.
4. The PRD's *Control plane*, *Cell* and *Fencing, overload, and dependency failure* sections
   ([`../prd.md`](../prd.md)).

## Your tickets

Six, all edges internal.

| # | Ticket | Blocked by |
|---|---|---|
| 20 | Placement is a record, not a column | — |
| 21 | A signed placement cache survives a control-plane outage | 20 |
| 22 | Every write carries its placement version and dies without the fence | 20 |
| 23 | No organization-owned query bypasses placement | 20 |
| 24 | An organization switch is revalidated in the target cell | 20 |
| 25 | Creating an organization is an idempotent, resumable saga | 20 |

`21` through `25` are independent of each other once `20` lands. Do `20` properly and the rest fan out.

Ticket `24` originally listed `01` (Session 1) as a blocker and **no longer does** — `POST
/organization/switch` already performs a membership check, so the revalidation has an existing check to
relocate into the target cell. If `01` has landed by the time you get there, use its resolved membership;
if not, use the check that exists. Do not wait.

## The seam you are deepening already works. Do not replace it.

This is the PRD's mistake #19 and the most likely way this session goes wrong:

> A sound region seam risked being redesigned twice. Replacing them would create competing placement
> truth instead of preventing a failure.

What exists today and is a **KEEP**:

- `common/region/region-registry.ts` — `regionForOrg` fails closed in **both** directions: an unplaced
  organization raises, and one placed in a region this deployment does not serve raises. The comment
  there explains why, and the reason still holds. It caches for 10 minutes on the assumption placement is
  effectively immutable — **that assumption ends at ticket 28 (Session 6) and your cache must know it.**
- `common/region/region.module.ts` — reads placement from `organizations.region` **outside** any tenant
  transaction, deliberately, because routing that read into a caller's transaction ties it to the wrong
  database the moment a second cell exists.
- `common/tenant/with-tenant.ts` — resolves the regional connection *inside itself* rather than at its
  callers, so a fourth caller added later cannot reach the wrong database. This is where ticket `22`'s
  fence check belongs, for the same reason.

Turn the region string into a placement record. Do not build a second registry.

**Six facts verified 2026-08-28 — read these before planning:**

- **Nothing placement-shaped exists yet.** No `organization_placement` table, no `cell_id`, no `shard`
  anywhere in `db/schema`. Ticket 20 is greenfield.
- **Exactly one region is configured by default.** `region.config.ts:57` `parseKeys` returns `[primary]`
  when `REGION_KEYS` is absent; secondaries come from `REGION_KEYS` plus
  `REGION_<KEY>_APP_DATABASE_URL`. `RegionDefinition` is `{ key, databaseUrl, storage }` and `storage`
  already carries region, endpoint, bucket, kbBucket, keys and public URLs — so the object-storage half
  of a placement record is partly modelled already.
- **`organizations` already has 37 columns including a lifecycle**: `ownerMembershipId`, `status`,
  `statusV2`, `purgeScheduledAt`, `purgeScheduledBy`, `purgeJobId`, `purgedAt`, `purgeReason`,
  `deletedAt`, `onboardingCompletedAt`. **Ticket 25's state machine is partly built** — read what these
  express before designing a new one.
- **Ticket 23's allowlist starts at 21 files, not zero.** `NoTenantTransaction`
  (`common/tenant/no-tenant-transaction.decorator.ts`) is used across 21 files, most of them AI
  controllers. `runOutsideTenantContext` appears in 9. Each needs a written reason or removal; a long
  unreasoned allowlist means the boundary is in the wrong place.
- **Ticket 24's membership check has a precise home.** `organization.controller.ts:137` is
  `@Post("switch") @Universal() @NoTenantTransaction()`, delegating to
  `org-profile.service.ts:81 switchOrg`, which checks `organizationMembers` via `withIdentity` at `:83`
  and throws at `:90-108` for missing / `SUSPENDED` / `LEFT`, then checks the org row itself at `:110-126`.
  That is the check to relocate into the target cell.
- **Ticket 25 has durable primitives to reuse, not to rebuild**: `common/outbox/outbox-publisher.service.ts`,
  `outbox-writer.ts`, `outbox-consumer.registry.ts`, `inbox-consumer.ts`, `external-effect-ledger.ts`, and
  `common/idempotency/idempotency.interceptor.ts` with its `commandFences` table. Adding a third retry
  mechanism is the defect this program keeps closing.

## Ask these first — plus anything else you find

1. **Signing key for ticket 21's placement cache: per-cell or control-plane-global?**
   *Recommend: a control-plane global signing key with a key id in the payload*, because a relocating
   organization's placement is issued by the control plane, not by either cell.
2. **Does `organizations.region` get dropped in this session, or dual-read until Session 6?**
   *Recommend: dual-read now, contract in Session 6.* Dropping it here means placement has one source
   before the second cell has ever been exercised.
3. **Ticket 22's fence check cost.** A network round trip per write is not affordable. Confirm: cached
   lease with an expiry shorter than the placement-cache TTL?
   *Recommend: yes* — and note the ordering constraint, that ticket 21's cache expiry must be shorter
   than the fence lease, or a cached placement outlives the write fence it implies.
4. **Which reads, if any, are correctness-sensitive enough to fence?**
   *Recommend: none.* Reads are not fenced; authorization, ownership, billing, quotas and read-after-write
   already go to the primary. Fencing everything by reflex doubles the cost of every read.

Read `region.config.ts` before asking anything about the topology — how many regions are configured is
answerable from the code, so do not spend a question on it.

## Territory

**Yours, exclusively:**

- `backend/src/common/region/**`
- `backend/src/common/tenant/**`
- `backend/src/modules/organization/**`
- `backend/src/db/schema/` — the new placement table (new file)
- The placement-bypass CI check for ticket `23` (new script under `backend/src/scripts/`, named for
  placement — do not modify existing alert scripts, which are S4's)

**Shared file — `backend/src/db/schema/common/auth.ts`.** You own the `organizations` block, **only**.
S1 owns `organizationMembers` / `userDelegations`; S2 owns `users`. Re-read before editing, edit only your
block, never reformat, commit it immediately.

**Not yours:** `modules/access`, `common/rbac`, `modules/hr`, `modules/payroll`, `modules/directory`,
`main.ts`, `frontend/lib/query-keys`. Report, do not edit.

## Traps in this territory

- **The Neon pooler drops startup parameters.** `postgres-js` `connection` timeouts are ignored and
  `options=-c` fails `08P01`. Only `SET LOCAL` inside the transaction works — which is exactly how ticket
  `22` must carry the placement version.
- **RLS is live.** A write with no tenant GUC dies `42501`. `this.db` is ALS-routed, so opening a
  transaction is not by itself enough to set the context.
- **After-commit hooks had no tenant context** — fixed systemically by wrapping every hook in the
  interceptor. Do not regress it while moving where transactions open.
- **A streaming handler commits early.** `pipeTextStreamToResponse` returns before the stream ends, so
  the transaction COMMITs while tools still run — proved with a `42501`. Relevant if you touch how a
  transaction's lifetime is bounded.
- **Prepared statements are disabled** (`prepare: false`), so `sql.placeholder` optimisation advice is
  inert here.
- **Ticket 23's check will under-report on its first run.** Every CI check in this program did. Write it
  against a deliberately bypassing query first, watch it fail, then run it clean. A check that has never
  failed proves nothing. And note the AI controllers: 14 of the 21 `NoTenantTransaction` sites are under
  `modules/ai/**`, so whatever reason they share should be written once, not 14 times.
- **`with-tenant.ts`'s own comment says it has three callers.** The reference list is now ~29 files
  including specs, re-exports and `with-identity.ts` / `for-each-org.ts` / `run-in-tenant-transaction.ts`.
  Re-count before trusting the comment, and correct it if it is stale rather than leaving it to mislead
  the next reader.
- **Transaction guards already exist and are per-transaction.** `pool.config.ts:82`
  `resolveTransactionGuards` returns `statementTimeoutMs` 30 s, `idleInTransactionMs` 60 s,
  `lockTimeoutMs` 5 s, applied via `set_config(…, is_local => true)` precisely because the pooler drops
  startup params. Ticket 22's placement version rides the same mechanism.
- **A from-based scanner cannot see `import "./x";`.** Ticket 23 must cover dynamic and re-export forms,
  and raw `db.execute(sql\`…\`)` call sites, which a Drizzle-shaped scan misses.
- **`import type` on an injected Nest service erases the DI token** — a silent `null` under `@Optional`,
  with `tsc` and `madge` both green. Tempting when breaking a DI cycle around the registry. Do not.
- **If the whole app goes blank, check the API URL before debugging modules.** Every module dead at once
  is one env pointer, not N bugs.

## Definition of done for this session

- All six tickets' criteria ticked with pasted evidence, or open with a written reason.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` clean.
- The existing region suites still pass unchanged — `common/region/*.spec.ts`,
  `common/tenant/__tests__/*`, `modules/storage/storage-region.spec.ts` — plus new specs for placement,
  fencing and the switch revalidation.
- Ticket `23`'s check runs in CI, fails the build non-zero, and has a recorded failing run against a
  deliberate bypass.
- Ticket `22`'s race test drives two concurrent writers under different placement versions and proves
  exactly one commits.
- `pnpm exec madge --circular` still zero.
- A commit per closed ticket, pathspec-scoped. **Session 6 cannot start until this session's commits
  land** — say so explicitly in your final report.
