# 15b — authorization fixes for ticket 15's confirmed defects

Session S4b. BE = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`.
Every defect ticket 15 confirmed is fixed. Ticket 19's resolver P1 and ticket 11's blog-AI
finding are folded in, as instructed.

---

## READ THIS FIRST — three harness assertions are now red *because* the defects are fixed

`nice -n 10 npx jest test/security/bola --maxWorkers=2` → **10 suites / 93 tests: 7 suites
green, 3 red (3 assertions).** I did not edit `test/security/bola/**`. All three red
assertions *pin the defect*, not its absence — they were written to fail when the finding is
repaired, so they cannot go green and be honest at the same time. They need their owner to
retire them.

| Assertion | Why it is red |
|---|---|
| `bola-scope-gate-integrity.spec.ts` → *KNOWN-OPEN crm/tasks: the widening gate collapses own and team into all* | Asserts `gatesOnAll === false` and `source.includes('!== "none"')` on `tasks.service.ts`. Defect P1-4 is fixed, so both are now the opposite. **The assertion encodes the vulnerability.** |
| `bola-bulk-mixed-tenant.spec.ts` → *KNOWN-OPEN hr/recruitment: enrollSequence does not verify candidate ownership* | Asserts `verifiesCandidates === false`. `enrollSequence` now verifies them. **The assertion encodes the vulnerability.** |
| `bola-scope-sibling-drift.spec.ts` → *NO-NEW-DRIFT: no permission key gains a scope-drifting sibling* | `tasks:read` newly qualifies as drifting **because** `GET /tasks` now resolves a DataScope. Before the fix *neither* side scoped, so the key was invisible to a detector that needs one scoped + one unscoped handler. Its remaining unscoped sibling is `GET /tasks/sequences` (org-level sequence *templates*, i.e. the "config list under an already-checked parent" the harness's own comment names as the benign case). Fixing this needs `tasks:read` added to `DRIFTING_KEYS`, which is harness territory. |

The other three `PINNED`/`RATCHET` assertions survived correctly: the fail-open resolver pin
passes vacuously (the pattern is gone), the drift `PINNED` list passes (each of the six keys
retains other unscoped siblings, so the finding is still defined), and
`bola-data-layer-binding`'s blog `KNOWN_OPEN_DEFECTS` ratchet is `<=` and still passes — the
blog routes stay unbound at the data layer *by design*, because a global table has no tenant.

Wider set: `nice -n 10 npx jest test/security --maxWorkers=2` → **24 suites / 327 tests, 20
suites green.** The fourth red suite is `test/security/upload-controls.spec.ts` (2 tests) —
pre-existing, storage module, already reported by ticket 15 as not-its-own and outside my
territory. Unchanged by me.

**Backend typecheck: `tsc --noEmit -p tsconfig.json` → exit 0** at the point all my `src/`
edits landed. A later run showed one error in
`src/modules/ai/core/gateway/__tests__/ai-gateway-metrics.spec.ts` — ticket 10's live edit, not
mine. Earlier in the session five errors appeared in `src/modules/cron/__tests__/**` and
`src/common/tenant/__tests__/for-each-org-failure-sink.spec.ts`; those resolved on their own,
also not mine.

---

## 1 (P0) — the vendor's global blog, reachable through every customer's org-admin short-circuit

**Seam chosen: a platform-only capability outside the per-org catalog, conferred by deployment
configuration.** Not a tenant column, and not a new guard on the controller.

Why this seam and not the others:

- **Not a tenant column.** `blog_posts`/`blog_categories` are genuinely global — one marketing
  site for the whole platform. Adding `org_id` would make the vendor's public blog per-tenant,
  which is a different product. Ticket 15 was right that the fix is the gate.
- **Not `OperatorSessionGuard`.** That guard requires an `:orgId` path param and resolves a
  time-boxed, customer-approved break-glass grant into *a customer's* tenant. A vendor-owned
  global resource has no `:orgId` and needs no customer's approval. It is the wrong shape.
- **Not "keep the key, gate the controller on standing".** Migration `0369_drop_platform_admin.sql`
  removed the platform-admin flag; there is no platform standing left in the schema, and
  `BE/migrations/**` is barred. Also, converting the eight handlers from `@RequirePermission` to
  `@AuthorizedInService` would move them from `permissioned` to `in-service` and break
  `bola-route-surface.spec.ts`'s hardcoded `OFFICIAL_TOTALS` — a harness file I may not edit.
- **Not deleting the catalog keys.** That breaks the cross-repo `catalog-sync.test.ts` contract
  in both directions.

What landed instead: the three `blog:*` keys are declared **platform-only**, which removes them
from the tenant permission catalog at resolution time while leaving them in the key catalog, so
`@RequirePermission`, `PermissionGuard`, the frontend union and `catalog-sync` all keep working
unchanged. `BlogAdminController` is **not modified** — it did not need to be.

- `BE/src/common/rbac/grantability.ts` — new `PLATFORM_ONLY_PERMISSION_KEYS`
  (`blog:posts:manage`, `blog:categories:manage`, `blog:ai:use`) + `isPlatformOnlyPermission`.
  `isDelegablePermission` now excludes them, which is what drops them from **every** tenant
  path in one place: role grants and delegations (via `mergeIfKnown`), module-ownership
  expansion (which never passes through the grant paths, per §5), and every write path.
  `assertPermissionsGrantable` refuses them with their own message — required, because
  `permission-delegability.spec.ts` asserts `isDelegablePermission` and the grant guard agree
  on every catalog key.
- **`BE/src/modules/access/access-policy.ts` — THE permission-computation change** (named
  prominently as instructed): `allCatalogScopes()` skips platform-only keys, so the
  OWNER/ORG_ADMIN short-circuit no longer confers them. New `platformCapabilityScopes(userId)`.
- `BE/src/modules/access/access-permission.resolver.ts` — merges `platformCapabilityScopes` at
  the two short-circuit returns and once at the end of the grant path.
- `BE/src/common/rbac/platform-operators.ts` (new) — `PLATFORM_ADMIN_USER_IDS`, a
  comma-separated allowlist. **Unset means nobody**, which is the correct fail-closed default
  for a vendor-only surface. `BE/src/config/env.validation.ts` + `BE/.env.example` declare it
  (both required by `env-coverage.spec.ts`).

Net effect: `authorize()` resolves `none` → `PermissionGuard` throws `ForbiddenException`. Every
customer org owner and org admin now gets 403 on `GET|PATCH|DELETE /blog/admin/*`, and no role,
group role, delegation, personal grant or module ownership can restore it.

**Operational consequence, stated plainly:** until `PLATFORM_ADMIN_USER_IDS` is set in the
deployment, `/blog/admin/*` is reachable by nobody. That is deliberate, and it is the honest
default — but it is a product decision the orchestrator should confirm.

Proof (`src/modules/access/__tests__/rbac-resolution.spec.ts`, 13 tests green):
- org owner resolves every *org* catalog key and **not** the platform-only ones;
- ORG_ADMIN likewise;
- a user on the allowlist resolves all three at `all` — **the surface is not merely dead**;
- a plain MEMBER on the allowlist resolves all three but still not `crm:leads:view`, proving
  the standing is the deployment's and not the organization's.

Two assertions in that spec previously looped over `ALL_PERMISSION_NAMES` and asserted an org
owner holds *every* key. **Those assertions encoded the vulnerability** and now loop over the
org-conferrable subset.

### Ticket 11's pairing — `blog-ai.service.ts` charged an empty org id

`BE/src/modules/ai/core/services/blog-ai.service.ts:52,78,104` passed `actor: { orgId: "", userId }`
with `charge: true`, and the audit row for `improve-writing` carried `orgId: ""`.

**Decision: the blog content is vendor-global; the AI *spend* is not.** Credits are a per-org
wallet and there is no platform wallet, so the coherent attribution is the organization the
operator is acting in — which is exactly what `runInTenantTransaction` in the same method
already uses. All three now pass the real `orgId`, and the audit row is tenanted. That also
makes the file agree with its own spec's docstring, which already claimed "the AI credit is
charged to the caller's org" while the code said `""`. I did **not** touch
`ai-gateway.service.ts` (ticket 10's live file). Added assertions to
`blog-ai-tenant-isolation.spec.ts` pinning the actor org and the audit org.

---

## 2 (P0) — six verified export/search DataScope drifts

Treated exactly as the pinned `/deals/export` fix: resolve the scope in the controller, apply
the same predicate the list sibling applies, in the SQL.

| Route | Fix |
|---|---|
| `GET /deals/aging` | `resolveDealsReadScope` → `applyScope(scope, …, { ownerColumn: deals.assignedToId })`. **Cache key was `deals:aging:${orgId}` with no scope** (a §6 violation on top); now `deals:aging:${orgId}:${scope}:${userId or "org"}`. `scope === "none"` short-circuits to an empty result. |
| `GET /clients/export` | `resolveClientsReadScope` → `clientPartyViewScope(orgId, userId, scope)`, the same helper `GET /clients/list` uses. |
| `GET /leads/export` | `resolveLeadsViewScope` → `pushLeadPartyViewScope(...)`, the same helper `GET /leads` uses. **This also closes P1-5**: the optional `assigneeId` filter now intersects with the caller's own scope, so an `own`-scoped SALES_REP asking for a rival's book gets an empty file instead of theirs. No separate gate needed. |
| `GET /contacts/export`, `GET /contacts/search`, `GET /contacts` | Contacts had **no** scope helper at all — `own` was unimplemented across the whole module, so scoping only the export would have been theatre (the list leaked the same rows). Added `contacts-scope.ts` + `contactPartyViewScope` on `businessParties.ownerUserId` (the column leads and clients already bind) and applied it to list, search and export. The cached list hash now carries the scope and the actor. |
| `GET /kb/search` | `resolveKbArticlesViewScope` → the same `ownerMembershipId` narrowing `GET /kb/articles` applies, plus a `scope === "none"` short-circuit. |
| `GET /sign/reports/dashboard` | Five aggregates already bound `senderMembershipId`; `recentActivity` was `signAuditEvents.findMany({ where: eq(orgId), limit: 10 })`. Now joins `sign_envelopes` and binds `senderMembershipId` unless the caller's scope is `all`. Directly reachable, since `sign:envelope:view` is seeded at `own` for module members. |

`pnpm -s check:scope-application` → **140 scope resolutions, 140 applied, OK** (every resolved
DataScope reaches a predicate).

### Two territory crossings to flag

1. **`BE/src/modules/kb/retrieval/**` is on my do-not-edit list, but `/kb/search` is named in
   my defect list.** I judged the specific instruction to outweigh the generic exclusion and
   made the smallest possible change: 3 lines in `kb-search.controller.ts`, 12 in
   `kb-search.service.ts`, no other file in that tree touched. Revert those two if the
   exclusion was meant to win.
2. **Related, NOT fixed, and worth routing:** `KbSearchService.retrieveTopArticles` — the
   actual RAG path behind `POST /kb/ask` — applies space ACLs, article restrictions and page
   visibility but **no article-owner DataScope**. It gates on `kb:pages:view`, a different key
   from the `kb:articles:view` drift, so it is outside the six. Same class of defect, same
   file.

---

## 3 (P0) — `enrollSequence` attached other tenants' candidates

`BE/src/modules/hr/recruitment/recruitment-automation.service.ts`. Candidate ids are now
deduped, verified against `eq(candidates.orgId, orgId)`, and the **whole request** fails with
`NotFoundException` (404, never 403) unless every id belongs to the caller's organization —
the `projects-tickets-query.service.ts:155` template. The insert also uses `.returning()`, so
`enrolled` is the affected count rather than the requested one.

**Harness coverage note, stated because it matters:** the deduped local
(`inArray(candidates.id, requestedIds)`) means `bulk-id-handling.ts`'s heuristic — which
requires the id array's *root* to be a method parameter — no longer classifies `enrollSequence`
as a bulk site at all, so it drops out of the harness's inventory rather than appearing as
`fail-whole`. Passing `input.candidateIds` straight into the predicate would be detected and
classified `fail-whole` correctly, but would push `sites.length` to 56 and trip
`BULK_SITE_BASELINE = 55` — a ratchet that counts *guarded* sites too, so a correct new guard
fails it. I chose the deduped version because it is the better code (exact guard, exact count),
not to get a green. The harness owner should decide which they want.

The durable fix is still an `org_id` column on `email_sequence_enrollments`
(`BE/migrations/**` and `BE/src/db/schema/**` are barred for me).

---

## 4 (P1) — `GET /tasks` gated on the key's presence, not its scope

`BE/src/modules/tasks/tasks-scope.ts` (new) holds `resolveTasksViewScope`; `TasksService.list`
now widens only on `scope === "all"`. `own` and `team` fall to the owner predicate, so
`?assigneeId=<anyone>` no longer returns that person's tasks. (`team` collapsing to `own`
matches `applyScope`, which does the same until `team` is materialised — §5.)

Fixing the list exposed the same shape on its sibling: **`GET /tasks/analytics` returned
org-wide aggregates plus a `perRep` leaderboard naming every assignee**, under the same
`tasks:read` key. Scoped with the same predicate.

---

## 5 (P1) — fail-open scope resolvers, and the two the sweep missed

All now fail closed by deleting the `if (!isScopable(KEY)) return "all"` branch entirely and
letting `resolved.get(KEY) ?? "none"` decide: a holder keeps their grant's own scope, a
non-holder is denied.

- `BE/src/modules/goals/goals-scope.ts` — `build:goals:manage` (named in the brief).
- `BE/src/modules/hr/directory/assets-scope.ts` — `hr:assets:manage` (named in the brief).
  `GET /hr/asset-returns` gates on `hr:assets:view` while the resolver reads `:manage`, so
  every viewer resolved `all`.
- **`BE/src/modules/dashboard/dashboard-scope.ts` — two more the harness could not see.**
  `resolveLeavesDashboardScope` on `hr:leaves:view` and `resolveBuildDashboardScope` on
  `build:tickets:view`; both keys lack `scopable: true`, so both resolved `all` for everyone.
  The harness's `FAIL_OPEN_RE` only resolves keys defined as a local string literal, and these
  come from `permissionOf("leaves-today")` / `permissionOf("recent-projects")`.

**Full audit of the remaining `isScopable` guard sites (20 of them):** the other 16 name a key
the catalog does marks scopable and are fine. One more gap exists —
`BE/src/modules/hr/performance/performance-scope.ts` on `hr:performance:manage` — but it fails
**closed** (`return "none"`), so it is a dead surface, not a hole. **Left alone deliberately**:
"fixing" it widens access, which is a product call for the HR owner, not a security fix.
`hr/directory/employees-scope.ts` and `inventory/stock-engine/inventory-scope.ts` pass the key
as a parameter; I resolved every key they are called with (`hr:employees:view|manage`,
`inventory:{products,purchase-orders,sales-orders,stock}:read`) and **all six are scopable** —
no gap.

**Two more specs asserted the insecure behaviour and were rewritten:**
- `assets-scope.spec.ts` → *"returns all when permission is not scopable"* — asserted the
  fail-open branch. Now asserts it denies, and that `isScopable(ASSETS_PERMISSION)` really is
  false so the test is not vacuous.
- `dashboard-project.service.spec.ts` → *"returns all regardless of access service…"* and
  *"never calls scopeFor — the isScopable guard short-circuits"*. Both asserted the fail-open
  branch. Rewritten; one mock also needed `.orderBy`/`.limit` because a previously unreachable
  non-`all` code path is now reached.

---

## 6 — ticket 19's resolver P1: unordered `.limit(500)` on role grants

`BE/src/modules/access/access-permission.resolver.ts`. Replaced with
`drainRolePermissionGrants`, a keyset drain over `rolePermissionGrants.id` (a `serial` PK) at
`ROLE_GRANT_PAGE_SIZE = 500` per page, `ORDER BY id ASC`, stopping on a short page. Not a
larger cap — that is the same defect with a later trigger.

**Test that bites:** `BE/src/modules/access/__tests__/role-grant-drain.spec.ts` (3 tests).
The fixture is every delegable catalog key — deliberately larger than one page, since a fixture
smaller than the limit cannot catch this, which is exactly why it survived. The db mock routes
on chain *shape* (`orderBy` is called only by the drain), so restoring the bare limit changes
the page count without desynchronising the other reads.

**Proof it bites, executed:** I temporarily collapsed the drain to a single page, ran the suite
→ **red, 152 keys silently missing** (`support:*`, `workflows:*`, `chat:huddles:moderate`, …);
restored → green. That is the non-determinism ticket 19 described, made visible.

The short-circuit fix and the drain interact exactly as the orchestrator warned: with
platform-only keys removed from `allCatalogScopes()` the short-circuit still returns for
owners/admins, so the *reachability* of the truncation is unchanged — but the drain removes it
regardless. Six sibling `.limit(500)`/`.limit(100)` caps in the same function (role
assignments, group members, module ownerships, personal grants, group-role assignments,
delegation permissions) are the same shape at much lower risk and are **left as-is**; each is
bounded by a single membership's rows, not by the catalog.

Six access specs needed `.orderBy` added to their `select` chain mocks (the drain calls it);
without it `safeAccessTableRead` swallowed the throw and returned `[]`, silently dropping every
role grant. That is worth noting in its own right: **`safeAccessTableRead` converts a query
error into "no permissions" with no signal.**

### Index for tickets 08 / 05b (migration territory — NOT applied by me)

`role_permission_grants` has no index leading with `permission_key`; its only composite is
`uniq_role_permission_grants_role_key (org_id, role_id, permission_key)`, unusable for a
`permission_key` predicate. Four live queries filter on it, one of them on the request path
(`access-permission-members.resolver.ts:131`). `user_delegation_permissions` already has
`idx_user_delegation_permissions_key`, so the omission is inconsistent, not deliberate.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permission_grants_org_permission_key
  ON role_permission_grants (org_id, permission_key);
```
Drizzle: `index("idx_role_permission_grants_org_permission_key").on(table.orgId, table.permissionKey)`.
`CONCURRENTLY` cannot run inside a transaction block — `db-bootstrap.mjs` already has that
special case.

### `SettingsController` (ticket 19's product question)

**My DataScope work does not touch it.** Nothing I changed is under `modules/settings`, and
none of the keys I re-scoped (`crm:deals:read`, `crm:clients:read`, `crm:leads:view`,
`crm:contacts:view`, `kb:articles:view`, `sign:envelope:view`, `crm:tasks:view`,
`build:goals:manage`, `hr:assets:manage`, `hr:leaves:view`, `build:tickets:view`) is a
`settings:` key. The custom-fields / automations / git-integrations rung problem is untouched
by this ticket and still needs its migration + product decision.

---

## Gates run (command → number I read)

| Gate | Result |
|---|---|
| `tsc --noEmit -p tsconfig.json` (8 GB heap) | **exit 0** with all `src/` edits in. A later run showed 1 error in `modules/ai/core/gateway/__tests__` — ticket 10's live edit, not mine. |
| `npx jest test/security/bola --maxWorkers=2` | 10 suites / 93 tests — **7 suites, 90 tests green**; 3 red assertions, all defect-pins (table at top). |
| `npx jest test/security --maxWorkers=2` | 24 suites / 327 tests — **20 suites, 322 tests green**; 3 as above + `upload-controls.spec.ts` (pre-existing, not mine). |
| `npx jest src/modules/access src/modules/rbac` | 67 suites — **65 green**, 544 tests pass. Only `backfill-slugs-exist.spec.ts` red (see below). |
| `npx jest` over all 13 touched module trees | **207 suites / 1287 tests, all green.** |
| `pnpm -s check:route-classification` | **0 UNDECLARED**; 3206 permissioned / 60 in-service — unchanged, so the harness's `OFFICIAL_TOTALS` pin still holds. |
| `pnpm -s check:scope-application` | **140 resolutions, 140 applied, OK.** |
| `pnpm -s check:permission-keys` | **OK** — 627 unique keys all resolve in both catalogs. |
| `pnpm -s check:unbounded-reads` | **OK — 0 violations** (the new candidate-ownership read is bounded by `.limit(requestedIds.length)`). |

## Red, and NOT mine — routing back to the orchestrator

- **`test/security/upload-controls.spec.ts` (2 tests)** — storage module, barred. Already
  reported as pre-existing by ticket 15.
- **`src/modules/rbac/__tests__/backfill-slugs-exist.spec.ts` (1 test)** —
  `0990_support_template_grant_backfill.sql` targets slug `CUSTOMER_SUPPORT`, which the seeder
  never produces. This is the permission-backfill slug trap again, from a migration another
  agent added. Migration territory.
- **`src/config/env-coverage.spec.ts` (1 test)** — `REDIS_COMMAND_TIMEOUT_MS` is read in
  `src/common/cache/cache.module.ts` and is not in the env schema. Not mine. (My
  `PLATFORM_ADMIN_USER_IDS` addition passes both halves of that spec.)
- **`src/common/rbac/module-registry-fields.spec.ts` (13 tests)** — `ENOENT` on
  `/Users/tarunchintakunta/Personal/streamline/frontend/...`. A cross-repo spec hardcoding a
  sibling path that does not exist in this layout. Not a regression.
- **`gdpr-subject-erasure*`** — you asked me to check this. **It passes: 2 suites / 58 tests
  green.** Not mine, and not currently red.

## Files changed

**New (BE):**
`src/common/rbac/platform-operators.ts` · `src/modules/contacts/contacts-scope.ts` ·
`src/modules/tasks/tasks-scope.ts` · `src/modules/access/__tests__/role-grant-drain.spec.ts`

**Modified — permission computation (named prominently for ticket 19 coordination):**
`src/common/rbac/grantability.ts` · `src/modules/access/access-policy.ts` ·
`src/modules/access/access-permission.resolver.ts`

**Modified — config:** `src/config/env.validation.ts` · `.env.example`

**Modified — services/controllers:**
`src/modules/ai/core/services/blog-ai.service.ts` ·
`src/modules/deals/deals-analytics.{controller,service}.ts` ·
`src/modules/clients/clients.{controller,service}.ts` ·
`src/modules/leads/leads-reports.controller.ts` · `src/modules/leads/leads-exports.service.ts` ·
`src/modules/contacts/{contact-party-reader,contacts-query,contacts.service,contacts.controller}.ts` ·
`src/modules/kb/retrieval/kb-search.{controller,service}.ts` ·
`src/modules/e-sign/sign-reports.{controller,service}.ts` ·
`src/modules/hr/recruitment/recruitment-automation.service.ts` ·
`src/modules/tasks/{tasks.service,tasks.controller,task-analytics.service}.ts` ·
`src/modules/goals/goals-scope.ts` · `src/modules/hr/directory/assets-scope.ts` ·
`src/modules/dashboard/dashboard-scope.ts`

**Modified — specs.** Two categories, and the distinction matters:
- *Asserted the insecure behaviour, rewritten to assert the fix:*
  `src/modules/access/__tests__/rbac-resolution.spec.ts` ·
  `src/modules/hr/directory/assets-scope.spec.ts` ·
  `src/modules/dashboard/dashboard-project.service.spec.ts`
- *Mechanical signature/mock updates only:*
  `src/modules/access/access.service.spec.ts` ·
  `src/modules/access/__tests__/{access-cache-scope,org-only-keys-never-resolve,snapshot-temporal-cap,personal-grant-resolution}.spec.ts` ·
  `src/modules/ai/core/services/blog-ai-tenant-isolation.spec.ts` ·
  `src/modules/contacts/{contacts.service,contacts-keyset-pagination,contacts-tenant-isolation}.spec.ts` ·
  `src/modules/tasks/task-analytics-tenant-isolation.spec.ts`

I edited nothing under `test/security/bola/**`, `BE/migrations/**`, `BE/src/db/schema/**`, or
`ai-gateway.service.ts`. I ran no git commands.

## New P0/P1 findings discovered while fixing

1. **P1 — two more fail-open scope resolvers** (`dashboard-scope.ts`, above). Fixed.
2. **P1 — `GET /tasks/analytics` leaked an org-wide per-assignee leaderboard** under
   `tasks:read`. Fixed.
3. **P1 — `GET /contacts` (the list itself) applied no DataScope**, so scoping only the export
   would have been cosmetic. Fixed.
4. **P1 — `KbSearchService.retrieveTopArticles`, the RAG path behind `POST /kb/ask`, applies no
   article-owner DataScope.** NOT fixed — different permission key, and it is deeper into a
   tree I was told not to enter.
5. **P2 — `safeAccessTableRead` turns a query error into an empty result with no signal.** Six
   spec mocks proved it: a missing `.orderBy` on the chain silently produced "this user holds
   no role grants" rather than an error. In production a transient failure on the grants read
   degrades a user to no permissions, quietly.
