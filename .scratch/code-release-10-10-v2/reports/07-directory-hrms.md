# 07 — Directory, Me and HRMS (PRD-C118 / PRD-C119)

Backend HEAD at start: `591cf663`. Frontend HEAD: `c1d952d48`. No boxes ticked — findings and
proofs only, per instruction.

---

## 1. The `/me/*` impersonation and `@RequireModule` sweep

**Method, and its measured reach.** Two independent passes, deliberately not sharing a code path.

- Pass A — `openapi.json` at head: 2,700 paths / **3,642 operations**, each carrying `x-exposure`
  and `x-permission`. 63 operations sit on a `/me` path segment; 54 carry a `self:*` key.
- Pass B — an independent AST-ish source walk over `src/`: **559 controller files, 574 `@Controller`
  decorators, 3,661 HTTP handlers** (3,648 non-spec + 13 spec probes). Cross-checks Pass A's 3,642
  to within the spec probes.
- Intersection judged: **78 self-service handlers** (a `me`/`mine` path segment or a `self:*` key).

### 1a. Impersonation — one candidate, no hole

Exactly **one** self-service handler in the whole repo accepts a subject id in its signature:
`GET /payroll/manager/team-rewards/{userId}`. It is a manager route, not a self route, and
`TeamRewardsService.getReportTotalRewards` calls `assertDirectReport` before reading
(`src/modules/payroll/insights/team-rewards.service.ts:174-177`). Not a hole. Payroll is outside my
territory; see §5.

`GET /hr/onboarding-docs/me` advertises a `userId` query parameter
(`src/modules/hr/lifecycle/dto/hr-lifecycle.schemas.ts:121`). It is **not** an impersonation hole:
`OnboardingViewsService.list` gates that filter behind `isAdmin`
(`src/modules/hr/lifecycle/onboarding-views.service.ts:210-215`) and the `/me` route passes
`isAdmin = false`, forcing `eq(onboardingDocuments.userId, actorUserId)`. It is a **contract wart** —
the OpenAPI document advertises a parameter on a self route that is silently accepted and discarded.
Recommend removing `userId` from the schema the `/me` route validates against. Not fixed here
because the schema is shared with the admin route and splitting it is a contract change worth
sequencing.

I also checked root §5's named trap against every widening filter in HR: the one widening `userId`
filter (above) is an `AND` alongside `applyScope`, so it can only narrow, and it is not gated on
`hr:employees:manage`. **The `manage`-beside-`view` no-op does not bite anywhere in HR's widening
filters.**

### 1b. `@RequireModule` on self-service — TWO DEFECTS, both fixed

13 self-service handlers carry a module gate. Eleven are legitimate (Build comment drafts, support
agent availability, payroll manager approvals, HR workflow delegations — none are surfaces root §8
guarantees). **Two are wrong:**

| file:line | route | key |
|---|---|---|
| `src/modules/hr/onboarding/core/onboarding.controller.ts:363` | `GET /onboarding/me` | `self:onboarding-tasks` + `@RequireModule("hr")` |
| `src/modules/hr/onboarding/core/onboarding.controller.ts:334` | `PATCH /onboarding/tasks/:taskId` | `self:onboarding-tasks` + `@RequireModule("hr")` |

`self:onboarding-tasks` is in `UNIVERSAL_MEMBER_PERMISSION_GRANTS`
(`src/modules/rbac/permissions/role-defaults.ts:5`) — merged before any role is read, so every active
member holds it. `hr` is `planGated: true` (`src/common/rbac/module-registry.ts:45`), and `ModuleGuard`
is a global `APP_GUARD` that throws `ModuleDisabledException` when the module is off
(`src/common/rbac/module.guard.ts:46`), reading handler metadata with `getAllAndOverride` so the
method-level decorator bites. **Net effect: a member of a Build-only or CRM-only org was 403'd out of
their own onboarding task list.**

The tell was inside the same controller: every other handler there is `@Universal()`, and the sibling
`self:onboarding-docs` controller (`onboarding-views.controller.ts`) carries no module gate at all.

**Fixed** — both `@RequireModule("hr")` decorators removed, plus the now-unused import.
`check:route-classification` EXIT=0, `check:module-gate` EXIT=0, `check:module-entitlement` EXIT=0.

### 1c. Frontend side — clean

All five `/me/*` routes (`attendance`, `time-off`, `expenses`, `recruitment`, `pay`) call
`requireSession()` only — no `requirePermission`, no `<RequireModule>`. No frontend defect here.

---

## 2. A confirmed runtime defect: roster upserts 42P10 on every call

`RostersService.upsertRosterEntry` (`src/modules/hr/time/rosters.service.ts:41`) used
`ON CONFLICT (roster_id, user_membership_id, date)`. No unique index, unique constraint or primary
key covered those columns in the Drizzle declaration **or** the catalog, so Postgres had no arbiter
and the statement failed at plan time — on every call, for every tenant, since the endpoint shipped.

**Reproduced, not inferred**, as `streamline_app` (`rolbypassrls = false`) on `scratch_gates_head`
at journal head:

```
BEGIN; EXPLAIN INSERT INTO roster_entries (...)
  ON CONFLICT (roster_id, user_membership_id, date) DO UPDATE SET notes='x'; ROLLBACK;
ERROR:  there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Nothing tested this path at any level.** `grep -rn upsertRosterEntry src test` returns exactly
three hits: the service, the controller, and the gate script. Not a mocked spec — *none*. The
13 spec files matching `/roster/i` are all unrelated (module-access member "roster", chat fanout,
`hr-calendar-source`). And a mocked spec could not have caught it regardless: ts-jest runs
`isolatedModules` and 42P10 comes from the **planner**, so only a spec against a real catalog — the
shape `chat-send-conflict-target.db.spec.ts` uses — can see this class at all.

### Two further drift findings on the same table

`src/db/schema/hr/rosters.ts` declared, and the catalog did **not** have:

- `index("idx_roster_entries_org_user_membership_date")` on `(org_id, user_membership_id, date)`
- `foreignKey "fk_roster_entries_user_actor"` `(org_id, user_membership_id) → organization_members
  (org_id, id) ON DELETE SET NULL`

**Is `check:declaration-constraint-drift` blind to them? No — it is ratcheted, not blind.** Both
were entries in `src/scripts/baselines/declaration-constraint-drift.json` (lines 116 and 169), two
of its 189 accepted findings. So this is **accepted debt, not a gate-reach failure** — worth saying
plainly, because the opposite conclusion was the live hypothesis.

I landed both, because the FK is load-bearing for the index design: the NULLS-DISTINCT argument below
rests on `ON DELETE SET NULL` actually existing.

### The migration

`migrations/1052_t07_roster_entries_natural_key.sql`, journal `idx 808` / `when 1803000010127`
(slot assigned by the orchestrator; inserted in `when` order, not appended — 677 entries, 0 duplicate
idx, 0 `when` inversions).

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_roster_entries_org_roster_membership_date"
  ON "roster_entries" ("org_id", "roster_id", "user_membership_id", "date");
```

- `org_id` **leads**: `roster_entries` is RLS-enabled (`relrowsecurity = t`, policy
  `tenant_isolation: org_id = current_org_id()`), so backend CLAUDE.md §7 makes `org_id` mandatory in
  a covering index — the policy qual is not leakproof, so the planner refuses an index that cannot
  supply it. §3 independently requires per-org business keys to be composite.
- **Not partial, NULLS stay DISTINCT.** The FK is `ON DELETE SET NULL`, so a departed member's rows
  become NULL-membership tombstones; `NULLS NOT DISTINCT` would collapse every departed member's row
  for one `(roster, date)` into one and lose the rest. Keeping it total also means the `onConflict`
  site needs no arbiter predicate — sidestepping the API asymmetry where `onConflictDoNothing` takes
  `{ target, where }` while only `onConflictDoUpdate` takes `targetWhere`, so a `targetWhere` on the
  former is dropped in silence.
- **Orphan repair before the key**: rows whose `user_membership_id` names a vanished membership are
  set NULL first — exactly what the FK would have done — so `VALIDATE` succeeds. Ordered before the
  index because nulling can only reduce collisions under NULLS DISTINCT.
- **Refuses rather than de-duplicates**: a `DO` block names the offending tuples and aborts. Choosing
  which roster entry survives is a scheduling decision a migration must not make silently.
- **NOT `CONCURRENTLY`.** The orchestrator's guidance said CONCURRENTLY was safe because
  `db-bootstrap.mjs:44,58` detects it. That is true of the runner but **would have turned the build
  red**: `check-migration-discipline.mjs:439` fails on `CREATE [UNIQUE] INDEX CONCURRENTLY` with a
  **zero baseline** (`BASELINE_CONCURRENTLY = new Set()`), because it cannot run inside drizzle-kit
  migrate's transaction wrapper. Plain `CREATE INDEX` + `SET lock_timeout = '5s'`, matching 1048's
  documented precedent on the same schema folder.

Service target widened to `[orgId, rosterId, userMembershipId, date]` — inference requires the target
list to equal the index columns exactly. Declaration gained the matching `uniqueIndex(...)`
(`src/db/schema/hr/rosters.ts`, granted for this change).

**Proof the fix lands**, same role, same database, after applying:

```
OLD target (roster_id, user_membership_id, date)          -> ERROR 42P10 (unchanged)
NEW target (org_id, roster_id, user_membership_id, date)  -> Insert on roster_entries
                                                             Conflict Resolution: UPDATE
```

Catalog after apply, on both scratch databases: `uniq_roster_entries_org_roster_membership_date`,
`idx_roster_entries_org_user_membership_date`, and `fk_roster_entries_user_actor` present with
`convalidated = t`.

`KNOWN_OPEN` in `src/scripts/check-conflict-target-inference.ts` emptied in the same change; the gate
now reports `0 ratcheted`. The two now-stale entries were removed from the drift baseline, shrinking
it 189 → 187 with the gate still green.

---

## 3. Cache findings (C118 privacy-safe caching, C119 invalidation)

Scanned **684 files / 46 cache call sites** across `kb/`, `hr/`, `directory/`, `search/`.

**Two dead invalidations — the `chat:unread` shape, confirmed present in HR:**

- `src/modules/hr/directory/employee-onboarding.service.ts:433` bumps `hr:salary-bands:${orgId}`.
  Nothing reads that key anywhere in the repo. A second site,
  `src/modules/hr/config/hr-salary-structures.service.ts:87`, `cache.del`s it.
- `src/modules/hr/directory/employee-onboarding.service.ts:434` bumps
  `hr:dashboard:payroll-summary:${orgId}`. No read anywhere. (The `payroll-summary` grep hits in
  `timesheets/` and `payroll/insights/reports.controller.ts:68` are a service class name and a CSV
  filename, not this key.)

Both are invalidation calls pinning a namespace nothing caches. Left in place and reported rather
than deleted — root §10 requires a module-graph proof before deletion, and `knip` is currently
misconfigured here (specs are entry points), so I will not cite it.

**Not defects, verified rather than assumed:** `hr:analytics`, `hr:celebrations`,
`hr:dashboard:metrics`, `hr:dashboard:headcount-trends` and `hr:employees:list` all have real
`cachedVersioned*` readers.

**A read/invalidate mismatch inside one service:** `celebrations.service.ts` has two caches —
`getCelebrations` (`cachedVersionedForOrg`, namespace `hr:celebrations`, reached by the bumps) and
`getAnniversaryFeed` (`:47`, a plain `cached()` on
`hr:anniversary-feed:${orgId}:${actorUserId}:${scope}:${today}`, reached by **none** of them). The key
is correctly permission-aware (it carries `actorUserId` and the DataScope) and self-expires daily, so
this is staleness, not a leak.

**A filter accepted and never applied** (`src/modules/hr/analytics-plus/hr-analytics-plus.service.ts`):
`getLeaveTrends(orgId, departmentId)` puts `departmentId` in the cache key at `:52` and then calls
`fetchLeaveTrends(this.db, orgId)` — `departmentId` is dropped. `getComplianceGaps` at `:84` does the
same. The API documents a department filter that does nothing; it over-returns rather than leaking
across a permission boundary, but it is a live correctness defect. Not fixed — the fix belongs in the
`fetch*` helpers and wants its own change.

Analytics-plus caches are keyed on `(org, department)` with **no** actor or scope dimension. That is
correct here: those handlers apply no DataScope and serve identical org-wide aggregates to everyone
who passes `hr:analytics:read`, so the key matches the query. `getPayrollCost` adds a second
permission check in the controller *before* the service, so the gate is upstream of the cache.

---

## 4. Commands run — literal, with exit codes

| command | exit | number produced |
|---|---|---|
| `pnpm typecheck` (backend, via `heavy.sh 2`) | **0** | 0 `error TS` lines |
| `pnpm check:spec-typecheck` | **0** | spec-inclusive typecheck passed |
| `pnpm exec jest --runInBand --testPathPattern="modules/(kb\|hr)/"` | **0** | 308/308 suites, 1983/1983 tests |
| `pnpm check:conflict-targets` | **0** | 362 sites, 159 targeted, 158 resolved, **0 ratcheted** |
| `pnpm check:migration-discipline` | **0** | 677 SQL files, 0 new violations, `concurrently=0` |
| `pnpm check:migration-chain` | **0** | chain verified |
| `pnpm check:migration-ledger` | **0** | 672 applied / 677 journal, 5 pending |
| `pnpm check:declaration-constraint-drift` | **0** | 873 tables, 4,948 declared, baseline 189 → **187** |
| `pnpm check:route-classification` | **0** | — |
| `pnpm check:module-gate` | **0** | — |
| `pnpm check:module-entitlement` | **0** | — |
| `pnpm check:cache-invalidation` | **0** | — |
| `pnpm check:type-assertions` | **1** | red for `common/cache/*` + `scripts/*`, **not mine** (see §5) |
| `pnpm check:placement-bypass` | **1** | red for `e-sign` + `timesheets`, **not mine** (see §5) |

**Gate reach, measured both ways** (the brief's requirement, reported honestly):

- `check:conflict-targets` scans **362** `onConflict` sites, 159 with an explicit target. My
  independent walk over **5,715 `.ts` files** finds **373** sites in **225 files**, **166** with an
  explicit target. An **11-site / 3.0% gap I did not reconcile** — substantially real reach, not the
  3.4%-of-corpus shape this repo has produced, but not an exact reproduction either. Left as an open
  question for that gate's next owner rather than resolved by assertion.
- `check:type-assertions` reports "application files scanned: 3648" — which matches my independent
  non-spec handler-file count. It excludes `*.spec.ts` by design (`SKIP_FILE`, line 108), so
  spec-side assertions are counted nowhere.
- `check:declaration-constraint-drift` compares **873 of 873** declared tables — full reach.
- `check:migration-discipline` checks **677 of 677** SQL files — full reach.

I did **not** run `knip` and make no dead-code claim resting on it.

---

## 5. Cross-territory findings (not fixed — not my paths)

1. **`check:placement-bypass` is red for other territories.** It was EXIT=0 at my start and EXIT=1
   after, and none of the six remaining `FAIL` lines are mine: `src/modules/e-sign/sign-ai.controller.ts:45`
   and five in `src/modules/timesheets/core/timesheets-ai.controller.ts`. Someone added
   `@NoTenantTransaction()` without an allowlist reason concurrently.
2. **`check:type-assertions` is red for three files, none mine**:
   `src/scripts/check-referential-action-drift.ts` (double cast, unledgered),
   `src/common/cache/cache-fill.ts` (2 assertions), and a **stale ceiling entry** for
   `src/common/cache/cache.service.ts` that must be deleted.
3. **`self:payroll` gates seven manager routes** (`src/modules/payroll/insights/manager-inbox.controller.ts:42-118`)
   including approve/reject of other people's loans and reimbursements. The key is universal — every
   active member holds it — so `@RequirePermission` is doing no work there. It is **not** a hole
   (the service asserts the manager relationship), but the honest declaration is
   `@AuthorizedInService("manager relationship")`, not a universal key that reads as a gate.
4. **`scratch_gates_head`'s catalog is ahead of its drizzle ledger.** Replaying pending migration
   `1049_t08_payroll_bank_batch_item_natural_key` in journal order fails with
   `relation "uniq_payroll_bank_batch_items_batch_subject" already exists` — its objects were applied
   without a ledger row. I therefore **deliberately did not insert a ledger row for 1052**: doing so
   raises the watermark past 1049/1050/1051 and turns `check:migration-ledger` red for reasons that
   are not mine. The gate is left at its clean baseline (EXIT=0). 1052's objects **are** applied to
   both scratch databases and verified in `pg_indexes`/`pg_constraint`.
5. **`kb_space_grants` has no writer.** Read by `KbAccessService.computeAccessibleSpaceIds:126-137`,
   deleted by `organization/core/org-membership-access-revocation.ts:194`, written only by
   `src/scripts/verify-membership-revocation.ts`. The "explicit per-user space grant" ACL branch is
   permanently empty in production — the inverse of the `chat:unread` shape: a live read pinned by a
   deletion path with no creation path.

## 6. Honest gaps

- Frontend: **not audited beyond the `/me/*` gating check in §1c.** Responsive/accessibility
  (C118) and frontend states/folder cohesion (C119) are **not run**.
- No E2E run. Allow/deny/cross-tenant E2E for Directory/Me (C118) and the representative HR
  workflows (C119) are **not run**.
- No read-cost benchmarking of HR list projections this pass — `db:check-hr-reads` **not run**.
- The `userId` contract wart on `GET /hr/onboarding-docs/me` is reported, not fixed.
- The two ignored `departmentId` filters in analytics-plus are reported, not fixed.
