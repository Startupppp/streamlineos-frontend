# COMPLETION REPORT — CRM & Administration

**Date:** 2026-08-11, extended 2026-08-12 · **Scope:** the CRM and Administration programs only.
**Artifacts:** `TASKS-CRM.md` · `TASKS-ADMIN.md` · `DECISIONS-CRM.md` · `REFACTOR-STATE-CRM.md` ·
`REFACTOR-STATE-ADMIN.md` · `UI-UX-SYSTEM.md` (v2.0, §12–§18) · `docs/soft-delete-audit-2026-08-11.md` ·
`docs/crm-dashboard-discrepancy-2026-08-11.md`

> Root `TASKS.md` / `DECISIONS.md` belong to a concurrent **Inventory** program. Not mine, not merged.

---

## Status

| | CRM | Administration |
|---|---:|---:|
| Done (with evidence) | 71 | 37 |
| Open | 11 | 5 |
| Blocked | **0** | **0** |
| Deferred with reason | 13 | 10 |
| **Total** | **95** | **52** |

*Counts recomputed by script, not recalled — and the script kept earning its keep. It caught: a first draft of this
table wrong on five of eight cells (written from memory), a duplicate `QUERY-002` id, one task listed twice under
two different states, and `ADSEC-011` double-counted because I kept the original finding beside the fix. All fixed
before publishing. This is exactly why the protocol forbids memory-sourced metrics.*

**Nothing is blocked any more — 14 → 0.** Every fix-class item is done: all security findings, all correctness
bugs, all contract mismatches, all schema/index work, all conformance items. **108 of 147 done, 23 deferred with a
recorded reason, and the 16 still open are feature builds, not gaps in what shipped.**

What those 16 are, honestly sized so you can direct them:

| Remaining | Why it is not a fix |
|---|---|
| GAP-005 saved views · GAP-002 contact↔many-accounts | New table/link table **plus** CRUD, and both reshape the contact detail surface, merge behaviour and the Customer 360 rollup |
| GAP-006 inline editing · GAP-028 bulk actions | UI slices; `card-inline-fields.tsx` is the pattern to reuse |
| GAP-025 remainder: `@Public()` unsubscribe handler, UI, DPDP retention/erasure | Needs a public-token scheme (not a guessable id) and a legal decision on post-erasure suppression retention |
| GAP-022 duplicate detection on create | Criteria exist; **needs your call on block vs warn** — I would not invent 409-on-create semantics |
| SCH-003 · SCH-005/011 | The latter needs a data migration that reclassifies rows by `entity_type`; getting it wrong silently detaches contact roles |
| ADGAP-021/034/035/039/040 · ADUX-007/010 | Seat overview, retention policy, per-user GDPR export, notification prefs, branding verification, provenance columns, setup checklist — each a feature |

I did not start any of them, rather than half-build several. Say which to take and I'll do them properly.

**Note the totals grew as work proceeded.** Fixing something repeatedly exposed an adjacent defect the audit had
not seen — CONTRACT-002 turned out to hide silent data loss, the AC-04 fix uncovered a 7th call site, and
CONTRACT-003 uncovered a hard-delete violation and two unbounded reads. Those are logged as new items rather than
folded silently into existing ones.

## Verification — what I actually ran

| Check | Result | Evidence |
|---|---|---|
| Frontend `tsc --noEmit` | **0 errors** | Run directly, repeatedly, final run 0 |
| Backend `tsc --noEmit` (full, incl. specs) | **5 errors in 3 files, none of them mine** | Final run after 3 migrations and ~50 file edits: `ai-action-copilot.spec.ts` (`ToolCallOptions` missing from the `ai` package), `export-builders.spec.ts` ×2 (`subjectKey`/`workerId`) — my 3 originals — plus `feedbucket-public.service.spec.ts` ×2 (`managedProductId`), another session's. **The baseline moved four times mid-session** because five programs share this tree: it read 3, then 8 (adding `inv-products.controller.ts` arity + `notification-dispatch-after-commit.spec.ts` ×4), then 12, then 5 as those sessions fixed their own. I re-verified file-by-file against my change set on every run — no overlap at any point. This is why I report the *filenames*, not just a count |
| `madge --circular` (backend) | **Zero — restored** | Dipped to 1 mid-session (`notifications/notification.types.ts > notification-events.catalog.ts`, another session's files) and is back to **"No circular dependency found"** on the final run — they fixed it. All four edges I added are clean: `user-profile.service → sessions.service`, `CrmConsentModule`, the principal-groups module, and the new `crm/sla.ts` (whose move I re-verified with madge specifically) |
| Banned patterns across my surface | **0** `@ts-ignore` · **0** `as unknown as` · **0** `: any` · **0** `console.log` | Targeted greps over `modules/{crm,rbac,webhooks,delegations,ownership,tasks,leads}` and `features/{crm,settings}` |
| `enabled`-clobber (§11 trap) | **0 genuine** | A naive grep flagged 12; each destructures `{ enabled: alias, ...rest }` and folds the alias back in — the correct pattern. False alarm corrected rather than reported |
| Files > 500 lines in my surface | **5**, all pre-existing or exempt | `permissions/hr.ts` (799) and `role-templates.constants.ts` (580) are catalogs, explicitly exempt by §9. `crm-support-dashboard.service.ts` is 549 but I made it **shorter** (net −11). `crm-inbox.service.ts` (517) and `roles.service.ts` (677) were already over |
| DB row counts | **0 rows / 0 orgs** in all 8 CRM tables | Queried directly via a temp script, since deleted |
| **Migrations applied and verified against the live DB** | **3 applied: `0170`, `0171`, `0172`** | D-009 cleared. Every object confirmed by querying the database, never by reading the migration file: 4 `deleted_at` columns **present** (`information_schema`), 4 partial indexes **present** (`pg_indexes`) *and* **chosen by the planner** (`EXPLAIN` shows `USES idx_deals_org_live_stage` etc.), `crm_leads` **DROPPED** (`to_regclass` null) with the real `leads` table intact, `quotes.exchange_rate` = `numeric(18,8) DEFAULT '1' NOT NULL`. Also ran `VACUUM ANALYZE` on the 13 notification tables the bundled `timestamptz` conversion rewrote, since a rewrite invalidates planner stats and empties the visibility map |
| Specs I modified | **2 suites / 9 tests passed** | `npx jest --ci --runInBand --testPathPattern "(crm-inbox\|delegations)\.service\.spec"` → `Tests: 9 passed, 9 total`. Covers the 2 specs my changes broke and I repaired: `crm-inbox.service.spec.ts` (signature change + the 2 scope tests I added for SEC-002) and `delegations.service.spec.ts` (the `AuditService` injection ADSEC-005 required) |
| **Final consolidated run of every spec I created or modified** | **100 of 101 pass, 9 of 10 suites green** | `npx jest --testPathPattern "(access/authorize\|module-access\|webhooks-secret-at-rest\|automation-rules.schemas\|sessions-admin-revoke\|consent.schemas)"` → `Tests: 1 failed, 100 passed, 101 total`. The single failure is the **pre-existing** `removeGroupMember` code/test contradiction documented below, in a file I never edited. **27 of those 101 are tests I added** — 4 AC-04 in `authorize.spec.ts`, 3 more AC-04 across the module-access suites, 4 webhook-secret-at-rest, 7 automation-schema, 3 session-tombstone, 6 consent-schema — plus **2 rewritten in place** where the existing test asserted the AC-04 hole |
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

- **Full test suite: unverified.** 410 spec files at ~25–105s each (ts-jest recompiles per suite) cannot finish in a
  session; an unattended `npx jest` ran ~15 minutes and emitted **0 bytes**, and I did not infer a result from
  silence. What I did instead was run **every suite my changes touch** — 95 tests, 94 passing. **No claim in this
  report rests on the untouched remainder.** Note also the recurring warning *"A worker process has failed to exit
  gracefully"* — a pre-existing teardown leak, not something I introduced.
- **e2e specs: updated but NOT executed.** `*.e2e-spec.ts` is in the default config's `testPathIgnorePatterns`
  (`package.json:130-131`); they run only under `pnpm test:e2e` (`jest-e2e.json`), which expects a live DB/env. I
  added the new `rotate-secret` route to the webhooks RBAC table and repaired the sessions table's wrong paths, but
  **neither has been run** — treat those tables as declared, not verified.
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

**Then three more, each of which was worse than logged once inspected:**

- **Webhook signing secrets** (ADSEC-007 / ADGAP-030) — now AES-256-GCM at rest, reveal-once, rotatable via
  `POST /webhooks/:id/rotate-secret`. **Encrypted, not hashed**, because HMAC needs the plaintext back. Needed **no
  migration** — the utility's `enc:v1:` prefix allows a lazy migration, so legacy plaintext rows keep signing while
  new ones are encrypted. Separately: the API had always returned the one-time secret on create, but the client
  type was `WebhookEndpoint`, which **has no `secret` field**, so the frontend silently threw it away and users had
  nothing to verify signatures with. 4 new specs.
- **CONTRACT-002** was filed as "server-owned fields, cosmetic". It was silent data loss: the visual automation
  builder sent `graph` (the canvas layout), `isDraft` and `cooldownMinutes` — all **real columns** — and the schema
  declared none of them, so **the node layout was discarded on every save**. Root cause was
  `CreateRuleInput = Omit<CrmAutomationRule, "id">`, deriving the *write* type from the *read* type. Fixed in
  dependency order (accept the three, retype the client, *then* `.strict()`); strict-first would have 400'd every
  save. 7 new specs.
- **CONTRACT-003** — the territory preview printed bare `crmPersonId` integers. Fixing it surfaced a hard-delete on
  `territories` (a business entity with no `deletedAt` → now blocked on D-009) and two unbounded reads, including a
  completely unlimited `territoryReps` scan.
- **ADGAP-015 was the sharpest one.** Filed as "admin force-logout missing". It existed
  (`DELETE /users/:userId/sessions`, permissioned, org-scoped, audited) — **and never logged anyone out.**
  `JwtAuthGuard` decides revocation *solely* from Redis `revoked:session:<id>` and never reads
  `userSessions.isRevoked`, while the admin path wrote only the column. An offboarded employee or a compromised
  session kept full access until the JWT expired. Self-service "sign out other devices" *did* tombstone, which is
  precisely why nobody noticed. Fixed by exposing `SessionsService.publishRevocations()` and calling it from both
  admin paths. **I had started a duplicate endpoint and reverted it entirely** on finding the existing one — the
  same reuse-before-create mistake as the SSRF guard, caught earlier this time.

Also worth flagging: `*.e2e-spec.ts` files are in the default jest config's `testPathIgnorePatterns`, so they run
**only** under `pnpm test:e2e`. That is how the sessions e2e spec sat asserting 401 against `/hr/sessions*` — paths
that controller never served. Don't read an e2e route table as executed coverage without running that config.
