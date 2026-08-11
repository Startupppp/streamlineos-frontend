# COMPLETION REPORT — CRM & Administration

**Date:** 2026-08-11 · **Scope:** the CRM and Administration programs only.
**Artifacts:** `TASKS-CRM.md` · `TASKS-ADMIN.md` · `DECISIONS-CRM.md` · `REFACTOR-STATE-CRM.md` ·
`REFACTOR-STATE-ADMIN.md` · `UI-UX-SYSTEM.md` (v2.0, §12–§18) · `docs/soft-delete-audit-2026-08-11.md` ·
`docs/crm-dashboard-discrepancy-2026-08-11.md`

> Root `TASKS.md` / `DECISIONS.md` belong to a concurrent **Inventory** program. Not mine, not merged.

---

## Status

| | CRM | Administration |
|---|---:|---:|
| Done (with evidence) | 56 | 31 |
| Open | 16 | 11 |
| Blocked | 12 | 1 |
| Deferred with reason | 8 | 8 |
| **Total** | **92** | **51** |

*Counts recomputed by script, not recalled — and the script kept earning its keep. It caught: a first draft of this
table wrong on five of eight cells (written from memory), a duplicate `QUERY-002` id, one task listed twice under
two different states, and `ADSEC-011` double-counted because I kept the original finding beside the fix. All fixed
before publishing. This is exactly why the protocol forbids memory-sourced metrics.*

**This is not "all tasks complete."** 27 items remain open and 13 are blocked. The protocol's ideal ending does not
apply: a hard external blocker (**D-009**) owns 12 of the 13, and what's left open is feature work — SSO/SCIM
explicitly descoped by you (D-019), plus enterprise gaps — not holes in what was delivered.

## Verification — what I actually ran

| Check | Result | Evidence |
|---|---|---|
| Frontend `tsc --noEmit` | **0 errors** | Run directly, repeatedly, final run 0 |
| Backend `tsc --noEmit` (full, incl. specs) | **3 errors, none in any file I touched** | Final run, after all AC-04 + spec edits: only `ai-action-copilot.spec.ts` (`ToolCallOptions` missing from the `ai` package) and `export-builders.spec.ts` ×2 (`subjectKey`/`workerId`) — the same 3 I started with. **The baseline moved twice mid-session** because five programs share this tree: a middle run showed 8, the extra 5 being `inventory/products/inv-products.controller.ts` (arity) and `notification-dispatch-after-commit.spec.ts` ×4 (`eventKey` widened to `string`); those sessions fixed their own before my final run. I verified name-by-name against my 14 changed files at every run — no overlap at any point |
| `madge --circular` (backend) | **No circular dependency found** — 2,976 files | Run directly after adding `CrmConsentModule` and the groups module |
| Banned patterns across my surface | **0** `@ts-ignore` · **0** `as unknown as` · **0** `: any` · **0** `console.log` | Targeted greps over `modules/{crm,rbac,webhooks,delegations,ownership,tasks,leads}` and `features/{crm,settings}` |
| `enabled`-clobber (§11 trap) | **0 genuine** | A naive grep flagged 12; each destructures `{ enabled: alias, ...rest }` and folds the alias back in — the correct pattern. False alarm corrected rather than reported |
| Files > 500 lines in my surface | **5**, all pre-existing or exempt | `permissions/hr.ts` (799) and `role-templates.constants.ts` (580) are catalogs, explicitly exempt by §9. `crm-support-dashboard.service.ts` is 549 but I made it **shorter** (net −11). `crm-inbox.service.ts` (517) and `roles.service.ts` (677) were already over |
| DB row counts | **0 rows / 0 orgs** in all 8 CRM tables | Queried directly via a temp script, since deleted |
| Specs I modified | **2 suites / 9 tests passed** | `npx jest --ci --runInBand --testPathPattern "(crm-inbox\|delegations)\.service\.spec"` → `Tests: 9 passed, 9 total`. Covers the 2 specs my changes broke and I repaired: `crm-inbox.service.spec.ts` (signature change + the 2 scope tests I added for SEC-002) and `delegations.service.spec.ts` (the `AuditService` injection ADSEC-005 required) |
| AC-04 authorization specs | **`authorize` + `permission.guard` 37/37 · all 5 `module-access` suites 61/62** | Four runs, and the failures taught me something each time. (a) `authorize.spec.ts` + `permission.guard.spec.ts` green immediately, including my 4 new AC-04 regression tests. (b) 11 failures across the `module-access` and caller suites, **all** `TypeError: Cannot read properties of undefined (reading 'findFirst')` — `isStructuralOrgAdmin` reads `db.query.organizationMembers`, which those mocks didn't declare. (c) **Three of them weren't mock gaps at all**: *"allows an org admin through the canonical reserved-key policy"*, *"allows an org admin (holds settings:rbac:manage) to create a group without querying rank"*, and a `isOrgAdmin === true` assertion each encoded the exact behaviour I'd just removed. Rewrote all three as structural-membership tests and added **3 more** AC-04 denial tests beside them. (d) Final: **61 passed / 62**, the one failure being the pre-existing `removeGroupMember` mismatch below |
| Caller suites for the changed `assertMayGrantRole` | **6 of 10 suites green; the 4 failures diagnosed** | `invitations-plan-limit`, `invitations-state-machine`, `organization-member-status`, `user-ops-bulk-update`, `employee-onboarding-seat-limit`, `module-access-audit` all pass untouched — evidence the signature change from `access` to `db` didn't disturb them |

### Two pre-existing red tests found along the way (not mine, not fixed)

Both surfaced while I was re-running specs around the AC-04 change. I checked each against my diff and neither
touches a line I wrote:

- `module-access-groups-security.spec.ts` › *"allows the module owner to remove themselves from a group"* —
  fails with a real `ForbiddenException` from `module-access-groups.service.ts:727`, whose guard is
  `if (!actor.isOrgOwner && userId === actor.userId)`. So the **code forbids what the test asserts**: either the
  guard should exempt the module owner, or the test encodes an intention that was never implemented. I did not
  touch `removeGroupMember`.
- `users-seat-limit.spec.ts` › *"checks the member seat limit before writing a direct-created member"* — fails
  with `cache.invalidateNamespace is not a function` at `membership-state.service.ts:30`. That is a **CacheService
  mock that predates the §22 namespace migration**; the seat-limit assertion never gets to run. Note it fails
  *after* passing through my changed `assertMayGrantRole`, which is itself evidence my change didn't break it.

Both sit in other programs' surface (D-015), so I recorded rather than fixed them.

### ⚠️ NOT verified

- **Full test suite: unverified.** Two suites took **112s and 209s** (333s wall for 2 files) — ts-jest recompiles the
  graph per suite, so the full suite cannot finish in a session. An unattended `npx jest` ran ~15 minutes and emitted
  **0 bytes**; I did not infer a result from silence. **No claim in this report rests on the full suite passing.**
  Also note both runs warn *"A worker process has failed to exit gracefully"* — a pre-existing teardown leak in these
  specs, not something I introduced.
- **Lint: not run** (CLAUDE.md §3 — only on request).
- **Backend production-config typecheck (`tsconfig.build.json`): unverified** — still executing. The full-config run
  above is the stricter superset (it *includes* the specs), so this is a formality rather than a coverage gap.
- **Nothing was verified at runtime.** The database is empty, so no code path was exercised against data. Everything
  is "implemented + typechecks", not "proven working".

## The hard blocker — D-009

`npx drizzle-kit generate` **fails**: `promptNamedWithSchemasConflict` inside its `enumsResolver` requires an
interactive TTY. Verified non-destructive afterwards — journal **byte-identical**, no `.sql` written (168 files →
168, 147 entries → 147). Compounding: 7 schema files are staged by concurrent sessions, so a successful generate
would bundle their in-flight work.

**Blocks 13 tasks:** consent tables · partial indexes on 10 tables · `deals`/`quotes`/`crm_campaigns` soft-delete
columns · saved views · contact↔many-accounts · FX snapshot · the money-type change.
**To unblock:** `pnpm -C backend db:generate` in a real terminal, answer the enum prompt, confirm the SQL contains
only the intended objects, then `db:migrate`.

## 🔴 Read this first — ADSEC-011, a platform-wide superuser bypass (found, then fixed)

Found while verifying an unrelated audit item. **Holding a single permission key — `settings:manage` or
`settings:rbac:manage` — granted `scope: "all"` on EVERY permission key across the platform.**

```
grantability.ts:20-26   grantsOrgAdmin() tested only those two keys
  → authorize.ts:37-39  returned { allow: true, scope: "all" }  (before the per-key check)
  → permission.guard.ts:8,37  PermissionGuard calls authorize() — the path every @RequirePermission uses
```

An owner building a custom role meaning *"let this person manage settings"* silently minted a **full platform
superuser** over payroll, HR and finance. Verbatim the path CLAUDE.md §21 forbids as AC-04 — yet
`module-access.helpers.ts:95-100` documented it as **intentional**, so code comment and constitution flatly
contradicted each other. You chose the structural fix.

**Fixed.** Org-admin standing now comes only from an active `organizationMembers` row that is owner or
`ORG_ADMIN` (`common/rbac/is-structural-org-admin.ts`). Three things worth knowing:

1. **`authorize.ts` needed the branch *deleted*, not replaced.** `access.service.ts:657-658` already returns
   `allCatalogScopes()` — every key at `all` — structurally for owners and ORG_ADMIN. A genuine admin never
   depended on the short-circuit, so it was pure redundancy for them and pure escalation surface for everyone
   else. **Zero new queries on the hot path**, which also answers the scope question I'd flagged as a blocker.
2. **The blast radius was wider than I first scoped — 7 sites, not 6.** `assert-may-grant-role.ts:20` read
   `ORG_ADMIN_PERMISSION_KEY` *directly*, so my `grantsOrgAdmin` grep never saw it. It gates **who may grant the
   ORG_ADMIN role**, across invitations, employee onboarding, org membership, settings and users — meaning a
   custom role carrying `settings:manage` could *promote other people to admin*. Signature now takes `db`
   instead of `access`; all 7 callers updated, each verified to inject `db` first.
3. **`grantsOrgAdmin()` is deleted, not deprecated**, so the unsafe path is unrepresentable (§20). The reserved-key
   constants survive only for `rbac.service.ts:314,321`, which legitimately asks "may this actor *propagate* this
   key" — a different question from "is this actor an admin".

Four regression specs pin the behaviour: each reserved key alone is denied an unrelated permission, a structural
admin is unaffected, and a scoped grant keeps `own` rather than being widened to `all`.

## Needs your confirmation (proceeded on conservative defaults)

**Now decided by you** (recorded as D-017…D-020): AC-04 fixed structurally · you run `db:generate` so the 12
schema tasks stay blocked meanwhile · SAML SSO + SCIM are out of scope as enterprise backlog · money stays
`decimal` as a documented §19 deviation rather than a half-migration.

Still open:

1. **D-005** — Gemini zero-retention terms unconfirmed, so **no new CRM data-egress path was built**.
2. **D-014** — measured 0 CRM rows here, but assumed live production tenants: SCH-002 produced a **discrepancy
   report and changed no figures**. A production delta must be accepted before any repoint.
3. **Your "leave in the working tree" instruction was overtaken by another session.** Commit `ae3cf746` — *"WIP
   snapshot: inventory Phase 1-2 plus unrelated in-flight work — SPLIT BEFORE SHARING"* — swept my in-flight work
   into it. Nothing is lost, but it is committed rather than pending, and I did not do it and cannot safely undo it
   (§0.11 forbids reset/rebase).

## Findings that did **not** survive verification

Recorded so they are not rediscovered. Six audit claims were wrong or overstated:

| Claim | Reality |
|---|---|
| `crm:access:view` is a ghost key | **Generated** for all 10 modules in `module-access.ts:19-25` |
| Ownership transfer "completely broken under RLS" (P0) | `createTenantAwareDb` routes `transaction` to the ambient tx, so it inherits the GUC. **P3** |
| `build:view` granted by nothing | Granted by **4** templates, enforced by **30** decorators |
| Permission matrix "saves immediately" | Already staged via `draft` + Reset + `role.version` 409 handling; only the diff preview was missing |
| ADSEC-F04 non-CRM orgs blocked from API keys | Owner: API tokens are CRM-level **by design**. My "fix" fully reverted |
| DSV-002 19 violations · DSV-003 22 · ADS-002 20 | **8 · 11 · 4** — the rest were deliberate product copy, Radix primitives, Cancel buttons, or icons with no animated equivalent in the 248-export catalog |
| ADSEC-010 role slug must be `/^[A-Z_]+$/` | **CLAUDE.md was the stale side.** Both enforcement points allow digits — `rbac.schemas.ts:22-27` and the canonical `CreateRoleDialog.slugify()`, which strips `[^A-Z0-9_]`. Tightening would have made `TIER_2_SUPPORT` uncreatable for zero security gain. Fixed the doc, not the code |
| ADSEC-008 module-access controller missing `@RequirePermission` | **Correct as written.** The key would be `${moduleKey}:access:*` and `moduleKey` is a path param, which a static decorator can't express; §21 also requires a delegated `<module>:access:manage` to confer *view only*, so decorating would grant the very authority the rule forbids. Authorization is structural in `assertModuleAccessPolicy`. The real defect in that file is **ADSEC-011** |
| CONTRACT-001 "silently strips data" | **Understated — 2 of the 3 were hard 400s**, so assignment-rule reorder and territory preview were dead features, not lossy ones. All 3 now fixed |

## My own errors, corrected

1. **I shipped a weaker SSRF guard.** `safe-external-url.ts` missed the packed `::ffff:7f00:1` form `new URL()`
   actually produces — it would have let loopback through — while `common/security/ssrf-guard.ts` already existed
   and handled it. Consolidated onto the existing guard, duplicate deleted, 0 references remain.
2. **I marked ADSEC-F04 closed while untouched**, then "fixed" a non-defect. Caught by re-reading the file.
3. **I claimed all 8 over-500-line files cleared** when 2 remained (one of which *I* had pushed over).
4. **I told you the array `@RequireModule` means "either"** — it is AND.
5. **I propagated an audit claim** that `/roles/analytics` returns per-role member counts. It does not.

## Highest-impact work delivered

**Security:** a P0 privilege escalation (`addRoleMember` had no rank check, so a rank-20 holder could add a
colluding user to ORG_ADMIN) · revoked invitations were resurrectable via resend · webhook SSRF to the cloud
metadata endpoint · an in-tenant scope escalation where `crm:tasks:update` was `scopable` but neither mutation
filtered by assignee · 5 swallowed deferred failures (3 the audit missed) · the permission catalog was
enumerable by any member.

**Correctness:** every merged lead reappeared in every list, board, count, export and report — 24 filters across 8
services fixed it · `/crm/tasks` exposed **every** task in the org to any member holding a universal
self-service key · 11 permission keys were ungrantable in the role editor · 5 sidebar entries gated on the wrong
key · audit records for every pipeline/stage/option change were silently discarded.

**Then:** all 8 over-500-line Administration files split · 26 CRM Zod schemas extracted · 24 write schemas
`.strict()`-ed · every CRM query permission-gated (was 0 of ~40) · AI results no longer open a Sheet to show a
sentence · `UI-UX-SYSTEM.md` gained a 9-archetype screen-template catalog.

**Final pass** — the AC-04 superuser bypass closed structurally (above); three broken CRM settings features
restored (CONTRACT-001: assignment-rule drag-reorder and territory preview returned 400 on *every* attempt;
territory rep assignment was a silent no-op); the reorder optimistic write corrected so the visible `Priority`
badge stops showing a stale number; a billing double-toast removed where hook and caller each fired their own,
one printing a raw backend string; the audit-log mobile filter converted to `ResponsivePopover`; the roles header
trimmed from 4 actions to 3; and a latent tab-panel bug removed where call sites re-added the unconditional
`flex` that `TabsContent`'s own comment warns overrides `hidden` and stacks inactive panels.

**Six audit items turned out not to be defects** and are recorded as such rather than "fixed": ADSEC-008,
ADSEC-010, ADS-001, ADS-006, ADS-018, ADS-019. Each has the disproving evidence inline in `TASKS-ADMIN.md`. That
is roughly a third of what remained — worth knowing before anyone re-runs the same audit.
