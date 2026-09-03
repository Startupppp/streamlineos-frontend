# 05 — Authentication, Organization, RBAC and Settings

**Agent territory:** backend `src/modules/{access,rbac,auth,organization,settings,module-access,users,sessions,mfa}/**` ·
frontend `features/{settings,organization,module-access,auth}/**`, `lib/rbac/**`
**Date:** 2026-09-03
**Databases measured:** `scratch_gates_head` (local Postgres, 127.0.0.1). Applied migrations at build time
672; the repo journal is now **674** (two HR/payroll migrations, `1049`/`1050`, landed after the database
was built — neither touches a membership FK, so the 2-entry gap does not explain any finding below).
Non-owner role `streamline_app` confirmed `rolbypassrls=f`, `is_superuser=off`.

---

## 1. The three handed-down findings — verdicts

### Finding 1 — `accounting:access:*` is frontend-only — **FALSE**

Both keys exist in the backend catalog. They are **generated template literals**, so the literal grep that
produced this finding could not have seen them:

```
src/modules/rbac/permissions/module-access.ts:8
  name: `${moduleKey}:access:view`   // over ACCESS_MANAGED_MODULES
```

`ACCESS_MANAGED_MODULES = delegableModuleIds()`, and `accounting` carries `ladder: "delegable"`
(`src/common/rbac/module-registry.ts:96`). Confirmed from **three independent sources that agree exactly**:

| Source | Result |
|---|---|
| `dump-permission-catalog.ts` (loads the real module) | 704 keys · 28 `*:access:*` · both accounting keys present |
| `pnpm check:permission-keys` | backend 704 / frontend union 704 · 0 ghosts · EXIT 0 |
| Live `permissions` table on `scratch_gates_head` | 704 rows · 28 `*:access:*` · both rows present, `administering_module_key='accounting'` |

A full bidirectional diff of the two catalogs returns **0 frontend-only and 0 backend-only keys** — the two
are in exact bijection at 704. There is nothing to fix and no drift anywhere in the catalog.

The scanner scripts already document the exact trap this finding fell into
(`src/scripts/check-permission-keys.mjs:36`): *"loaded from the real module through ts-node, not greped —
`<module>:access:view` is a generated template literal and a text scan misses all twelve of them."*
(That comment says "twelve"; there are now **14** access-managed modules / 28 keys. Stale comment, harmless.)

**Was there a gate that should have caught it?** Both named gates not only would have — they *did*, and they
have real reach (§2). The premise that they "pass over a frontend-only key" is false; they pass because the
catalogs genuinely match. `check:permission-catalog` additionally proves the frontend copy is **byte-identical
to a fresh regeneration from the backend**, which makes this class of drift structurally impossible while that
gate runs. The gate-reach finding the brief anticipated is not here — but three real ones are, in §2.

### Finding 2 — `lockMembersQuota` bypassed at 5 of 6 membership-insert sites — **FALSE as stated; a real code-drift defect underneath, now fixed**

The seat lock **is** acquired at every tenant-facing membership insert. It was written as an **inlined copy**
of the helper rather than a call to it, which is precisely why `grep lockMembersQuota` returned one caller and
read as "5 of 6 bypassed". All five inlined copies produced the identical lock key `quota:${orgId}:members`,
so behaviour was correct throughout.

All nine production `organizationMembers` insert sites, classified:

| # | Site | Advisory lock | `assertWithinLimit(…, tx)` | Verdict |
|---|---|---|---|---|
| 1 | `organization/core/invitation-create.service.ts:253` | inlined | ✓ same tx | correct |
| 2 | `organization/core/invitation-acceptance.service.ts:101` (`assertSeatAvailable`, gates inserts at **:291** and **:362**) | inlined | ✓ same tx | correct |
| 3 | `users/users.service.ts:128` → insert :132 | inlined | ✓ same tx | correct |
| 4 | `users/users.service.ts:176` → insert :192 | inlined | ✓ same tx | correct |
| 5 | `hr/directory/employee-onboarding.service.ts:100` (`reserveMemberSeat`, gates inserts at **:158** and **:295**) | inlined | ✓ same tx | correct |
| 6 | `auth/auth.service.ts:116` | none | none | **exempt** — owner bootstrap |
| 7 | `organization/core/org-profile.service.ts:346` | none | none | **exempt** — owner bootstrap |
| 8 | `organization/setup/org-setup-resolver.service.ts:236` | none | none | **exempt** — owner bootstrap |

Sites 6–8 insert the **first** member (`isOwner: true`) into an organization created microseconds earlier in
the same transaction against a freshly generated UUID. There is no seat quota to breach at seat 1 and no
concurrent contender for that orgId. **Formally dispositioned as correct-by-construction, not a gap.**

**The real defect** was six definitions of one lock key. If `quotaLockKey()`
(`billing/core/seat-definition.ts:14`) ever changes shape, the five inlined copies diverge silently and stop
serialising against `SeatLedgerService`'s own lock — a latent seat-overrun bug, and the thing that made this
finding look true.

**Fixed** — collapsed the four copies inside my territory onto the exported helper:
`invitation-create.service.ts`, `invitation-acceptance.service.ts`, `users.service.ts` ×2. The now-unused
`sql` import was removed from the two files that no longer need it. Behaviour is byte-identical (same key,
same `pg_advisory_xact_lock(hashtextextended(...))`).

> **Cross-territory (ticket 07):** `hr/directory/employee-onboarding.service.ts:100` still carries the fifth
> inlined copy. Same one-line change — `await tx.execute(lockMembersQuota(orgId));` plus the import from
> `../../billing/core/seat-definition`. Left untouched because `src/modules/hr/**` is not mine.

### Finding 3 — C116 settings ownership — **CLEAN on the ownership clause; 2 violations of the adjacent redirect clause**

All 23 global `/settings/*` routes classify as organization configuration, access governance, my-account or
platform billing. **Zero module-owned surfaces and zero operational work in global settings.**

| Bucket | Count |
|---|---|
| Organization configuration | 9 |
| Access governance | 10 |
| My Account | 1 |
| Platform billing (`/settings/billing`, `/settings/billing/ai-credits`) | 2 |
| **Module-owned surface (violation)** | **0** |
| **Operational work (violation)** | **0** |

Counts reproduced independently: **23** global settings `page.tsx`, **62** module `/<module>/settings/*`
`page.tsx`. Every module-owned surface the contract names lives where it belongs — custom-fields ×3,
automations ×4, integrations ×2, import-export ×3, templates, workflows — all under `/<module>/settings/*`,
none under `/settings/*`. The CRM settings tree alone (24 routes) is larger than all of global settings (23).

Forbidden platform-billing routes, all confirmed **unreachable**:

| Route | Directory | `page.tsx` |
|---|---|---|
| `/billing` | exists | **no** — holds only `layout.tsx` + the legitimate `invoices/` subtree |
| `/billing/ai-credits` | absent | — |
| `/settings/subscription` | absent | — |
| `/billing/seats` | absent | — |

**Two violations of §8's "delete the old route files — no legacy redirects"** — both in HR territory, both
files whose entire body is a redirect:

- `app/(authenticated)/hr/settings/company/page.tsx:6` → `/settings/organization` (function body is
  `requirePermission(...)` then `redirect(...)`, renders nothing)
- `app/(authenticated)/hr/onboarding/my-tasks/page.tsx:4` → `/me/onboarding` (function is literally named
  `LegacyMyOnboardingTasksRoute`)

Both are ticket-07 files; **reported, not edited**. `next.config.ts:115-126` additionally carries a
config-level legacy redirect `/build/:projectId/workload` → `/build/:projectId?view=workload` (ticket 09).

**One borderline call for a product decision:** `/settings/webhooks`. The contract names *integrations* as
module-owned, and webhooks are an integration surface — but the event catalog is cross-module
(`features/settings/webhooks/webhook-schema.ts:15-26` spans CRM, support, HR and access events), so no single
module owns it, and `/build/settings/integrations` + `/hr/settings/integrations` already exist as the
module-owned surfaces. I read it as compliant platform infrastructure. Flagging rather than ruling.

---

## 2. Gate reach — measured, with an independent walk for every gate cited

**Not run is not passing.** Every exit code below was captured with `cmd > log 2>&1; RC=$?`, never through a
pipe (`${PIPESTATUS[0]}` is empty in this zsh and reads as success).

| Gate | EXIT | Self-test | Coverage the gate printed | My independent walk | Reach |
|---|---|---|---|---|---|
| `check:permission-keys` | **0** | — | 3138 `@RequirePermission` usages, 633 unique keys, 24 constant-args; catalogs 704/704 | **3138** usages / **24** constant-args / **495** files — exact match | **real** |
| `check:permission-catalog` (FE) | **0** | — | 704 permissions, 14 delegable modules, 633 route-bound keys, byte-identical regeneration | 704/704 bijection, 0 drift both directions | **real** |
| `check:permission-binding` (FE) | **0** | — | 566 controllers / 3642 routes indexed; 1707 wrapper + 689 enabled gate sites; **2384 bindings checked**; 13 held-back, 0 unaccounted | 522 files / ~2500 hook call sites under `hooks/api/**` → 95% resolved | **real** + floors |
| `check:route-access-contract` (FE) | **0** | — | 26 navigation source files, 204 keys checked, 633 `x-permission` | `components/layout/sidebar/*.ts` = **26** — exact match | real but **narrow** |
| `check:owner-authority` | **0** | 0 | 3653 files scanned; 9 declared / 9 enforced; 12 owner shortcuts | **272** `isOrgOwner` mentions in non-spec source vs ~**22** decision-bearing sites | **oversold** |
| `verify:rbac-integrity` | **0** | — | **19 probes over 9 constraints**, every rejection paired with an ACCEPT control | read the output; controls present | **real, bite-proved** |
| `verify:membership-revocation` | **1** | — | 248 PASS · **33 FAIL** · **68 SKIP** | see §4 | **real, and failing** |
| `check:record-access` | **0** | 0 | 1192 `findFirst`, 591 record reads — **no file count printed** | walk includes **2916** files | real, under-reported |
| `check:scope-application` | **0** | 0 | 150 scope resolutions, 150 applied | 150 reproduced over 79 files — but **569** handler sites carry one of the 50 scopable keys | **wrong denominator** |
| `check:module-entitlement` | **0** | 0 | **prints no scan count** | 90 lines, **no filesystem walk**, `PILOT_MODULE="timesheets"` | **vacuous — 1 of 22** |
| `check:module-gate` | **0** | 0 | prints only `PASSED` (count suppressed unless verbose/failing) | **391 of 546** controllers | **155 unscanned** |
| `check:navigation-permissions` | **0** | 0 | 439 nav gates / 198 unique keys; catalog 704; 633 enforced | 15 sidebar files matched | real |
| `check:cache-invalidation` | **0** | 0 | 1076 service files, 187 write sites, 475 invalidate sites, 131 key factories | — | shape census real; verdict rests on **13 hardcoded checks** |
| `check:tenant-isolation` | **0** | 0 | 931/931 tenant-owned services (100%) | — | **soft** — matches any of 11 loose regexes, one is bare `/isolation/i` |
| `check:authz-deny` | **0** | 0 | 3235 gated handlers, 924 covered (**29%**), uncovered 2311 ≤ ratchet 2441 | — | honest about its own hole |
| `check:gated-reads` (FE) | **0** | — | 12 permissioned+ungated, all held back; 275 `useGatedQuery` reads | — | **self-declared narrow** |
| `check:idempotent-commands` | **0** | — | 546 controllers scanned | requires the decorator only on a curated critical-verb list | narrow by design |
| `check:route-classification` | **0** | — | ALL ROUTES CLASSIFIED | — | real |

### The three gate-reach findings worth acting on

**(a) `check:module-gate` never looks at this ticket's controllers.** Its walk is driven by the 22
`moduleFolder` entries in `src/common/rbac/module-registry.ts`, not by the 74 directories on disk, so it scans
**391 of 546** controllers. The 155 it skips include **16 of this ticket's 18 controllers**:

| Module | In registry | Controllers |
|---|---|---|
| access · auth · rbac · module-access · users · sessions · mfa · organization | **NO** | 2+1+3+2+1+1+1+5 = **16 unscanned** |
| settings | yes | 2 scanned |

Its anti-vacuity floor is `CONTROLLER_MIN = 200`, which 391 clears comfortably, so the 155-controller gap can
never trip it. **The entire authentication, RBAC, module-access and organization authority surface is outside
this gate's reach**, and a green result must not be cited as evidence for C113 or C116.

**(b) `check:module-entitlement` is a one-module assertion.** 90 lines, no walk, no glob, no printed count.
It validates that `timesheets` round-trips `planGated`/`storedKey` — **1 of 22 manifest modules, 1 of 11
plan-gated**. Its entire green output is one line. It is not evidence for module entitlement anywhere.

**(c) `check:scope-application` measures the wrong denominator.** It counts 150 sites where a *already-resolved*
scope was applied. It has no notion of a scopable permission, so it can ask "was a resolved scope applied?"
but never "did this scopable handler resolve a scope at all?" The catalog declares **50 scopable keys**, named
by `@RequirePermission` at **569 handler sites across 137 controllers**. **50 of those 569 sit in module trees
that resolve no scope anywhere** (surveys ×21, crm ×10, customer-executive ×6, finance ×6, quotes ×3, ai ×2,
sales ×2). Green says nothing about any of them.

Also: `check:owner-authority`'s name oversells it. It does its stated job — nothing fabricates `isOrgOwner: true`
and all 9 catalog entries are enforced — but that is a 9-row catalog checking itself plus 12 shortcut sites,
against a 272-mention `isOrgOwner` surface. It is **not** evidence for C113's "exhaustive owner protections".

---

## 3. C081 — BOLA/IDOR, measured as the non-owner `streamline_app`

Tested as `streamline_app` (`rolbypassrls=f`, `is_superuser=off`). As the owner, BYPASSRLS makes every tenant
policy inert and a cross-tenant read proves nothing.

**Data layer — 824 tables, zero leaks, and the probe is provably non-vacuous:**

| Probe | Result |
|---|---|
| RLS-enabled public tables carrying `org_id`, scanned with GUC pinned to org A | **824** |
| Tables leaking **any** row belonging to another org | **0** |
| Tables that returned own-org rows (anti-vacuity floor) | **70** |
| Errors during the sweep | **0** |
| Tenant tables carrying `org_id` with **no** RLS ("readable org-wide") | **0** |

The 70 own-org-visible tables matter: had RLS simply denied everything, the zero-leak result would prove
nothing. The probe demonstrably sees data when entitled and never when not.

**Inverse direction** (GUC = org B) — `total_visible` equals `own_B` exactly on every table, so nothing
outside B is visible at all:

| Table | own(B) | foreign(A) | total visible |
|---|---|---|---|
| `organization_members` | 8 | **0** | 8 |
| `org_modules` | 20 | **0** | 20 |
| `roles` | 3 | **0** | 3 |
| `role_assignments` | 1 | **0** | 1 |
| `role_permission_grants`, `access_versions`, `module_ownerships`, `invitations`, `user_permission_grants` | 0 | 0 | 0 |

**Fail-closed with no GUC:** `role_assignments`, `user_permission_grants` and `roles` all raise
`42501 no tenant context: app.organization_id is not set for this transaction` via `app.current_org_id()`.
`organization_members` uses `current_org_id_or_null() OR user_id = current_user_id_or_null()` and correctly
returns **zero rows** rather than raising — deliberate, because a user must see their own memberships across
orgs for the org switcher.

**Application layer — 404-not-403 discipline, static audit of the whole territory:**

| Measure | Count |
|---|---|
| Territory files scanned (non-spec) | **199** |
| `where()` blocks examined | **518** |
| Id-keyed object loads | **145** |
| …without an org predicate in the same window | **29** |
| …that are real BOLA defects after triage | **0** |

The 29 triage as: **24** loads of the global `users` table keyed by the caller's own `@CurrentUser()` id
(`users` is global identity, deliberately without `org_id` or RLS per backend CLAUDE.md §4); **4** load-then-act
where a preceding tenant/user-scoped load is the gate; **1** the org switcher, where a different org id is
legitimately client-supplied per root §5.

The four that needed real scrutiny, all clean:

- `sessions/sessions.service.ts:103` — `revokeOne` updates by session id alone, but line 95 first loads with
  `and(userSessions.id, userSessions.userId)` and throws `NotFoundException` on a miss. Cross-user id → **404**.
- `mfa/mfa.service.ts:229` — `resetForUser(targetUserId)` first resolves membership inside
  `runInTenantTransaction` with `and(orgId, targetUserId)`, `NotFoundException` on a miss. Cross-tenant → **404**.
- `mfa/mfa.service.ts:154` — `matchedId` is derived from a list already filtered by `userId`, never client input.
- `organization/core/org-profile.service.ts:156` — org switch; membership is checked at :121 **before** the
  `organizations` read, so a non-member never reaches the existence check.

Role CRUD is exemplary: every load is `and(eq(roles.id, roleId), eq(roles.orgId, actor.orgId))` with
`NotFoundException` on a miss (`roles.service.ts:180, 195, 279`). Every surviving `ForbiddenException` in the
territory is an in-tenant authority denial — which is exactly what backend CLAUDE.md §4 reserves 403 for.

**One minor consistency note (not a defect, no oracle):** the org switcher returns **400**
`BadRequestException("You are not a member of this organization")` (`org-profile.service.ts:127`) where 404
would be more canonical. It is not an existence oracle — the response is identical whether the target org
exists or not, because the membership lookup decides before anything reads `organizations`.

---

## 4. C111 / C113 / C114 / C117

### C114 — effective-permission resolution is batched, cached and bounded — **holds**

`access-resolution-cost.spec.ts` pins explicit pooled-connection budgets and asserts them **as a non-owner**
("is measured as a non-owner, because an owner never exercises this path", `membershipRow.isOwner === false`):

| Path | Budget |
|---|---|
| First resolution after a version bump | **2** borrows |
| Warm | **0** borrows |
| Steady state, local backstop expired, shared value warm | **1** borrow |
| Shared cache unavailable | **2** borrows every time |

`pnpm exec jest --testPathPattern="access-resolution-cost|access.service.spec|authorize.spec|permission.guard.spec|apply-scope"`
→ **EXIT 0, 11 suites, 104 tests passed.**

**Scope expansion is bounded**: every read in `access-permission.resolver.ts` carries an explicit cap —
`.limit(500)` ×5 and `.limit(100)` ×1 (lines 153, 171, 184, 210, 270, 330).

**`apply-scope.ts` no longer carries the correlated subquery** that backend CLAUDE.md §5 made a precondition
for shipping `team`: it takes a materialised `teamIds` array and falls back to `own` when absent.

### C117 / C111 — tenant-leading indexes on every access path — **holds**

Every RBAC access-path table carries an `org_id`-leading composite covering its subject / role / permission /
module lookup. Verified against `pg_indexes` on `scratch_gates_head`:

| Table | Covering index |
|---|---|
| `role_assignments` | `(org_id, organization_membership_id, role_id)` · `(org_id, role_id)` |
| `role_permission_grants` | `(org_id, role_id, permission_key)` · `(org_id, permission_key)` |
| `user_permission_grants` | `(org_id, organization_membership_id, permission_key)` · `(org_id, module_key)` |
| `user_delegations` | `(org_id, delegatee_membership_id, status)` · `(org_id, ends_at)` |
| `user_delegation_permissions` | `(org_id, delegation_id)` |
| `principal_group_members` | `(org_id, organization_membership_id)` |
| `group_role_assignments` | `(org_id, principal_group_id, role_id)` |
| `module_ownerships` | `(org_id, module_key)` |
| `org_modules` | `(org_id, module_key)` · `(org_id, id)` |
| `user_module_access` | `(org_id, organization_membership_id, module_key)` |
| `access_versions` | PK `(org_id)` |
| `organization_members` | `(org_id, user_id)` · `(user_id, org_id)` · `(org_id, status)` · `(org_id, role)` · `(org_id, is_owner)` · partial `(org_id) WHERE is_owner` |

### C113 — strict Zod, stable OpenAPI, idempotent mutations, owner/descendant protections

**Zod strictness — 5 real gaps found, 4 fixed.** Scanned **131** `z.object(` occurrences across **25**
schema-bearing files in the territory; **7** were not immediately `.strict()`; one was a false positive (a
comment), one is a deliberate keep:

| Site | Disposition |
|---|---|
| `users/dto/users.schemas.ts:20` `emergencyContactSchema` | **fixed** — nested inside a `.strict()` parent, and `.strict()` does **not** propagate in Zod, so `emergencyContact` silently stripped unknown keys |
| `access/entitlements.controller.ts:15` `toggleModuleSchema` | **fixed** — the module-enablement toggle body, i.e. access governance |
| `access/entitlements.controller.ts:11` `moduleKeyParamSchema` | **fixed** |
| `organization/core/dto/organization.schemas.ts:79` `businessHours` value object | **fixed** — nested in `z.record` under a `.strict()` parent |
| `organization/setup/dto/announcements.schemas.ts:30` `announcementBodyBase` | **fixed** — `.superRefine()` wrapped a non-strict object, so `POST /org/announcements` stripped silently |
| `organization/setup/dto/org-setup-completed-payload.schema.ts:4` | false positive — the match is inside a comment |
| `organization/core/integration-connection-disconnected-consumer.service.ts:13` | **deliberately left lenient** — an outbox payload, not a client boundary. Strict parsing here would make a producer adding a field break every not-yet-deployed consumer; additive forward-compatibility is the correct property for an event schema |

Every tightened schema was checked against the frontend payload **before** the change, because `.strict()`
turns a silent strip into a 400:

- `emergencyContact` — `features/users/user-edit-form.tsx:89-97` sends exactly `{name, relation, phone, email?}`; `hooks/api/users/types.ts:61` agrees. Exact match.
- `businessHours` — `types/organization.ts:28` is `Record<string, {open, close, enabled}>`; `mergeHours` builds exactly those three. Exact match.
- `toggleModuleSchema` — `hooks/api/access/org-modules.ts:106` posts exactly `{ enabled }`. Exact match.
- announcements — `CreateHrAnnouncementData` = `HrAnnouncement` minus `{id, orgId, authorId, readCount, createdAt}` = exactly the 9 keys in `announcementBodyBase`. Exact match.

> **Behaviour change, deliberate, flagged.** `announcements-create.spec.ts` asserted the *old* lenient
> behaviour — "strips unknown fields so clients cannot mass-assign columns" — feeding `id`, `orgId`,
> `readCount` and expecting them dropped. The spec pinned the **mechanism**; the security property is
> "cannot mass-assign", and `.strict()` satisfies it more strongly by rejecting instead of silently accepting.
> Root CLAUDE.md §9 is explicit: *"A bare `z.object({})` strips a dropped field silently rather than rejecting
> it, which turns a removed field into a wrong-subject write instead of an error."* I rewrote the test to
> assert rejection (naming the three unrecognised keys) and **added** a companion test proving the nine
> legitimate client-owned fields are still accepted, so the change is pinned in both directions.

**Idempotency — PARTIAL, and deliberately not "fixed".** Across the role/grant/module-access controllers:
**13 POST handlers, 9 carry `@Idempotent`, 4 do not** — all four in `module-access.controller.ts`:

| Line | Route | Underlying write |
|---|---|---|
| 102 | `POST :moduleKey/standing/transfer-owner` | `.insert(moduleOwnerships).onConflictDoUpdate` — naturally idempotent |
| 115 | `POST :moduleKey/standing/:membershipId` | `.insert(roleAssignments).onConflictDoNothing()` — naturally idempotent |
| 239 | `POST :moduleKey/groups/:groupId/members` | unique `(principal_group_id, organization_membership_id)` |
| 283 | `POST :moduleKey/members` | unique `(org_id, organization_membership_id, role_id)` |

All four converge on retry because the writes are upserts against unique indexes that exist (verified in the
index dump above). The residual gap is that a retry returns a different HTTP response rather than a stored
replay. **I did not add the decorator**: an `@Idempotent` route **400s without an `Idempotency-Key` header**,
so adding it to four live routes whose frontend callers do not send one would break them. This needs a
paired frontend change and is a product decision, not a unilateral backend fix.

`check:idempotent-commands` passes (EXIT 0, 546 controllers) but only *requires* the decorator on a curated
critical-verb list (`CRITICAL_ROUTE_RE` / `CRITICAL_METHOD_RE`), so its green is **not** evidence that
role/grant/module-access CRUD is idempotent.

**Owner/descendant protections.** `verify:rbac-integrity` EXIT 0 — 19 probes over 9 constraints, each
rejection paired with an ACCEPT control, so it cannot pass vacuously. It proves cross-org assigners and
granters are rejected at the database (`23503` on
`fk_role_assignments_assigner_membership`, `fk_user_permission_grants_granter_membership`), and that a grant
whose permission is not administered by the named module is rejected
(`fk_user_permission_grants_permission_module`). `check:owner-authority` EXIT 0 — but see §2: it is a 9-row
catalog checking itself and must not be cited as "exhaustive".

---

## 5. Defects found that need another territory

### D1 — `verify:membership-revocation` FAILS (EXIT 1): 33 wrong FK actions, 68 declared FKs absent

Run against `scratch_gates_head` as the database owner. **248 PASS · 33 FAIL · 68 SKIP.** Sub-checks:
Removal artifacts PASS · No inheritance PASS · **Inventory vs FKs FAIL**.

This is **pre-existing declared-vs-live drift**, not caused by anything in this ticket — I changed no schema
and no migration, and the two journal entries the database is missing (`1049`, `1050`) are payroll migrations
that touch no membership FK.

The consequence is real: for the 68 relationships where the declared FK **does not exist in the database**,
revoking a membership leaves a dangling `*_membership_id` with no referential enforcement at all; for the 33
with the wrong `ON DELETE`, revocation cascades or blocks where the declaration says it should null.

In my territory: **`org_unit_members` declared `set-null`, actual `cascade`** (`fk_org_unit_members_membership`)
— revoking a membership silently deletes its org-unit placement rows instead of nulling them. Absent FKs on
`org_units` and `organization_people` (`archived_by_membership_id`, `updated_by_membership_id`).
The bulk is HR (`hr_people`, `hr_employments`, `workers`, ~40 more), notifications, chat, calendar and build.

**Fix requires `src/db/schema/**` + `migrations/**`, both DO-NOT-EDIT for this ticket.** Routing to whoever
owns the schema baseline.

### D2 — transient RED from another agent's in-flight schema edit — **RESOLVED during this session**

Mid-session the backend typecheck went **EXIT 2** on exactly one error:

```
src/db/schema/inventory/warehouses.ts(5,20): error TS2724:
  '"../common/organization"' has no exported member named 'organizationMembers'. Did you mean 'orgUnitMembers'?
```

`git status` showed `src/db/schema/inventory/warehouses.ts` modified by another agent (the symbol lives in
`./auth`). It took `check:spec-typecheck` to EXIT 2 and stopped two specs from loading
(`membership-artifacts.spec.ts`, `membership-artifact-fk-coverage.spec.ts`, both dying at `warehouses.ts:73`).

**Not mine** — I touched no schema file. That agent's fix landed before I finished, and re-running gives:
`typecheck` **EXIT 0 / 0 errors**, `check:spec-typecheck` **EXIT 0**, territory specs **EXIT 0**.
Recorded only so the intermediate red in the log is not mistaken for a real regression.

Note for whoever owns the membership-FK workstream: `src/modules/organization/core/membership-artifact-fk-coverage.spec.ts`
is being edited in the shared tree right now (12 insertions / 32 deletions, shrinking the expected
disagreement list as schema declarations get corrected). It sits under my nominal path but is that agent's
work — **I did not touch it.** It pairs directly with D1.

### D3 — `check:type-assertions` RED on a stale ledger entry (not mine)

**EXIT 1**: `src/common/cache/cache.service.ts: no plain assertion left — delete the entry`. Someone *removed*
an assertion (an improvement) without lowering the ledger. `src/common/cache/**` is DO-NOT-EDIT for this
ticket. I added no assertions — the gate found none in my files.

### D4 — two legacy redirect pages (ticket 07)

See Finding 3. `hr/settings/company/page.tsx:6` and `hr/onboarding/my-tasks/page.tsx:4`.

### D5 — `verify:membership-revocation`'s npm script points at shared Neon

`"verify:membership-revocation": "node --env-file=.env -r ts-node/register src/scripts/verify-membership-revocation.ts"`.
The script **writes** (`organizationMembers` inserts at :280, :286, :422; `organizations`/`users` deletes in its
`finally`) and carries **no `scratch_`-name guard**. Run as scripted it seeds and deletes an organization in
whatever `.env`'s `DATABASE_URL` points at — the shared remote Neon branch. I ran it with `DATABASE_URL`
overridden to a local scratch database instead. Worth a guard.

---

## 6. Files changed (backend only; no frontend file was modified)

| File | Change |
|---|---|
| `src/modules/users/users.service.ts` | 2 inlined seat locks → `lockMembersQuota(orgId)`; import added; unused `sql` import removed |
| `src/modules/organization/core/invitation-create.service.ts` | inlined seat lock → helper; import added; unused `sql` import removed |
| `src/modules/organization/core/invitation-acceptance.service.ts` | inlined seat lock → helper; import added (`sql` still used) |
| `src/modules/users/dto/users.schemas.ts` | `emergencyContactSchema` → `.strict()` |
| `src/modules/access/entitlements.controller.ts` | `moduleKeyParamSchema`, `toggleModuleSchema` → `.strict()` |
| `src/modules/organization/core/dto/organization.schemas.ts` | `businessHours` value object → `.strict()` |
| `src/modules/organization/setup/dto/announcements.schemas.ts` | `announcementBodyBase` → `.strict()` |
| `src/modules/organization/setup/__tests__/announcements-create.spec.ts` | mass-assignment test asserts rejection, not stripping; companion accept-test added |

**Commit attribution:** all 8 files above were swept into commit **`a4014486`** *"fix(contracts): response
schemas were 100% covered by a gate counting nothing"* — a **49-file** commit belonging to another ticket.
Nothing is lost (HEAD contains all of it: 3 `lockMembersQuota` references in `users.service.ts`, both
`.strict()` additions in `announcements.schemas.ts`), but every change in this report is attributed to
ticket 04's message. This is another instance of the shared-index incident the agent brief documents —
I ran no git write command of any kind.

---

## 7. Commands run — literal, with exit codes

| Command | EXIT | Produced |
|---|---|---|
| `pnpm check:permission-keys` | 0 | 3138 usages, 633 unique, catalogs 704/704 |
| `pnpm check:permission-catalog` (FE) | 0 | 704 permissions, 633 route-bound, byte-identical regeneration |
| `pnpm check:permission-binding` (FE) | 0 | 2384 bindings checked, 0 unaccounted |
| `pnpm check:route-access-contract` (FE) | 0 | 26 nav files, 204 keys, 633 `x-permission` |
| `pnpm check:gated-reads` (FE) | 0 | 12 ungated, all held back out of scope |
| `pnpm check:owner-authority` | 0 | 3653 files, 9/9 enforced, 12 shortcuts |
| `pnpm check:owner-authority:self-test` | 0 | — |
| `pnpm check:record-access` (+ self-test) | 0 / 0 | 1192 findFirst, 591 record reads |
| `pnpm check:scope-application` (+ self-test) | 0 / 0 | 150 resolutions, 150 applied |
| `pnpm check:module-entitlement` (+ self-test) | 0 / 0 | 1 module (`timesheets`) |
| `pnpm check:module-gate` (+ self-test) | 0 / 0 | 391/546 controllers |
| `pnpm check:navigation-permissions` (+ self-test) | 0 / 0 | 439 gates, 198 unique keys |
| `pnpm check:cache-invalidation` (+ self-test) | 0 / 0 | 1076 service files, 475 invalidate sites |
| `pnpm check:tenant-isolation` (+ self-test) | 0 / 0 | 931/931 (100%, soft) |
| `pnpm check:authz-deny` (+ self-test) | 0 / 0 | 3235 gated, 29% covered, ratchet held |
| `pnpm check:idempotent-commands` | 0 | 546 controllers, critical-verb subset |
| `pnpm check:route-classification` | 0 | ALL ROUTES CLASSIFIED |
| `verify-rbac-referential-integrity.mjs` (owner, `scratch_gates_head`) | 0 | 19 probes / 9 constraints |
| `verify-rbac-referential-integrity.mjs` (as `streamline_app`) | 1 | refuses to assert vacuously — `42501`, correct behaviour |
| `verify-membership-revocation.ts` (owner, `scratch_gates_head`) | **1** | 248 PASS / 33 FAIL / 68 SKIP |
| BOLA RLS sweep as `streamline_app` (psql) | 0 | 824 tables, 0 leaks, 70 non-empty |
| no-GUC fail-closed probe (psql) | 1 (expected) | `42501` on 3 of 3 tables |
| `$HEAVY 2 -- pnpm typecheck` (before edits) | **0** | 0 errors |
| `$HEAVY 2 -- pnpm typecheck` (mid-session) | 2 | 1 error, in another agent's `warehouses.ts` — transient |
| `$HEAVY 2 -- pnpm typecheck` (**final**) | **0** | **0 errors** |
| `pnpm check:spec-typecheck` (final) | **0** | — |
| `pnpm check:type-assertions` | **1** | stale ledger entry in `src/common/cache/**` (foreign, still red) |
| `jest --testPathPattern="access-resolution-cost\|access.service.spec\|authorize.spec\|permission.guard.spec\|apply-scope"` | 0 | 11 suites, 104 tests |
| `jest --testPathPattern="announcements\|users.schemas\|organization.schemas\|entitlements"` | 0 | 8 suites, 68 tests |
| `jest --testPathPattern="modules/(users\|organization\|access\|rbac\|module-access\|settings\|sessions\|mfa\|auth)/"` (**final**) | **0** | **192 suites passed, 1562 tests passed, 4 skipped, 0 failed** |

---

## 8. Honest gaps

- **No booted-API BOLA test.** C081 is proved at the data layer (824 tables as a non-owner) and by static
  audit of all 199 territory files. I did **not** boot the API and issue cross-tenant HTTP requests, so the
  404-not-403 claim rests on reading every id-keyed load rather than on observed status codes.
- **C112 (frontend/TanStack allow/deny/cross-tenant E2E) — not run.** No Playwright/E2E suite was executed.
  Query-key tenant isolation is asserted by `lib/query-scope-isolation.test.tsx`, which I did not run either.
- **`check:cache-invalidation`, `check:tenant-isolation`, `check:authz-deny`, `check:record-access`,
  `check:scope-application`, `check:module-gate`, `check:module-entitlement`,
  `check:navigation-permissions`** were executed and their exit codes read, but by a delegated agent. I
  independently reproduced the two load-bearing claims myself (`check:module-gate` 391/546 with 16 of my 18
  controllers unscanned; `check:module-entitlement` 1 of 22) and spot-verified `check:owner-authority`. The
  remaining numbers in the §2 table are that agent's reading of the gates' own output.
- **The measured database is 2 journal entries behind head** (672 applied vs 674 in the journal). Both are
  payroll migrations touching no membership FK, so no finding above depends on the gap — but the D1 drift
  numbers would need re-measuring on a database at exact head before being used as a fix checklist.
- **`/settings/webhooks`** is a judgment call I flagged rather than ruled on (§ Finding 3).
