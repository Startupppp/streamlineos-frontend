# PRD — Org access remediation: org creation · member admission · module availability · session claims · hierarchy · schemas

Status: **COMPLETE — every TODO item in §5–§12 is ticked against re-read source** · Baseline commit `6c90c9686`
· Date 2026-09-10 · executed 2026-09-11 · **re-audited and finished 2026-09-11 (second pass)**

The first pass shipped the six candidates but never ticked the boxes. The second pass re-verified all 78
items against current source rather than trusting the log, found three genuinely incomplete, and closed
them. What each item's evidence is now appears beside it; §13 records both passes.
Source: architecture review run 2026-09-10 (report `%TEMP%/architecture-review-20260910-231327.html`)
Scope approved by the owner: **all seven candidates and the full defect ledger.**

Not a lane file. Deliberately **outside** `architecture-refactor/prd/`, because
`frontend/scripts/check-prd-traceability.mjs:8` reads `architecture-refactor/prd/**` and fails an
unindexed lane. No `PRD-Cnnn` id is created or renumbered here.

**Evidence grade:** `[V]` = read at the cited line during the review session · `[R]` = explorer-reported
with line anchors, not independently re-read. **Re-verify `[R]` before acting on it.**

---

## 1. Why

Both repos typecheck at 0 errors and `PRD-ARCHITECTURE-REVIEW-2026-09-10.md` closed eleven candidates
fully green hours before this review. The reported breakage is therefore not compile-level and not a
single module being wrong. In every audited area the same shape recurs: **one question answered by two
or three modules that do not know about each other** — each individually correct and tested, disagreeing
at the edges. The edges are where org creation, invites and module assignment live.

Each candidate collapses N answers into one.

## 2. Decisions taken — do not re-litigate

Settled with the owner on 2026-09-10. A change of mind is a new decision, recorded here, not a silent edit.

| # | Decision | Chosen |
|---|---|---|
| D1 | Allowed-email-domain restriction | **Org-wide policy** — enforced on every admission path, not invite only |
| D2 | Archived-member restore | **Admission returns a discriminated result**; `OrgMembershipStatusService` keeps the restore itself |
| D3 | Hierarchy move endpoints | **Delete now, rebuild when needed** — C6 is moot, not deferred (§8.1) |
| D4 | Hierarchy `DELETE` routes | **Delete, and port the tenant-isolation assertion** to the archive path |
| D5 | Hierarchy consolidation depth | **Shared skeleton + per-kind adapters** — not a full generic `OrgUnitCrud<Kind>` |
| D6 | C4 scope | **Narrow** — delete the dead machinery, do **not** move the seam |
| D7 | Degrade removal depth | **All four branches AND the `RBAC_MIGRATION_MODE` env var** |
| D8 | Session freshness | **Piggyback the access `version` + a 5-minute backstop poll** |
| D9 | Query eviction on permission change | **Promote `useHomeCacheSync` app-wide** |
| D10 | Bulk onboarding | **`admitMany` batch entry point** — preserves the one-lock/one-assert invariant |
| D11 | Error messages | **Standardise on the invite/Users wording**; update the two specs that pin strings |
| D12 | Domain rule at invite acceptance | **Create-time only** — a pending invite is a promise already made |
| D13 | C1 depth | **Setup → saga; register fixed in place** — signup is latency-sensitive, so it keeps its path but loses both defects |
| D14 | `/org/setup/complete` retry safety | **Natural server-side idempotency**, NOT `@Idempotent` — the decorator 400s any caller without an `Idempotency-Key` header |
| D15 | Org-count cap | **No cap. Delete the false comment.** Orgs are tenants, not a metered resource |
| D16 | C7 scope | **54 non-trivial schemas + 2 misplaced files + payroll `z.infer`.** Leave the 173 trivial param guards and the 174 frontend `.tsx` schemas |
| D17 | Org-setup wizard | **Sequencing moves server-side** into the existing setup-completed outbox consumer |
| D18 | Test suite | **Full suite on C1, C2, C3.** Typecheck + gates only on C4, C5, C7 |
| D19 | Module-gate deny-blindness | **Deliberately NOT fixed** — a consequence of D6, recorded so it is not read as an oversight (§6) |

## 3. Corrections carried in from the review

Each one changed a recommendation. Two contradict things stated earlier in the same review.

- **A reported P0 was withdrawn.** `org-profile.service.ts:360` calling `seedSystemRolesForOrg(this.db, …)`
  inside an open transaction is **not** a cross-connection deadlock. `DRIZZLE` is a tenant-aware `Proxy`
  (`common/tenant/tenant-db.ts:14-25`) resolving every property against the ambient tenant transaction, so
  `this.db.transaction(…)` becomes a savepoint on the same connection. `[V]`
- **The `degrade` fail-open is not production-reachable.** `env.validation.ts:78` defaults to `"off"` and
  `:365-371` throws on boot if `NODE_ENV=production` and the mode is `degrade`. Nothing sets it anywhere.
  Ranked High in the report; the correct rank is **Low**. `[V]`
- **C4 is not the smallest edit.** `AuthContext.moduleAvailable()` is actor-bound; `assertModuleEnabled`
  takes no actor. A full repoint needs plumbing through ~8 call sites plus a param decorator that does not
  exist, and `ApiKeyGuard` (`api-key.guard.ts:52`) has no actor at all. Hence D6. `[R]`
- **C3's headline was overstated.** "~1,749 lines become one module" assumed uniformity the six services do
  not have. The identical part is the skeleton, not the projections. Hence D5. `[R]`
- **ADR 0004's own claim holds.** `moduleAvailability()` reads `getModuleMap` directly, not
  `getModuleState`, so the unified path genuinely carries no fail-open. `[V]`
- **Unrelated, not ours to fix:** `PRD-ARCHITECTURE-REVIEW-2026-09-10.md:269` cites
  `org-hierarchy-permission-fence.e2e-spec.ts` as "103 passed". That file does not exist under
  `backend/src`; the only permission-fence e2e is billing's. `[V]`

## 4. Sequencing

`C2 → C1 → C4 → C5 → C3 → C7`. One branch per candidate, committed between tasks.

C2 and C1 are adjacent — both live in `modules/organization/core` — so they run back to back to avoid
conflicting edits. C7 is broad but mechanical and runs last so it does not churn files the other
candidates are still moving.

Git is orchestrator-only: commit on the current branch, **never** push, checkout, branch, merge, pull,
fetch, reset, stash or rebase (root §1.11).

---

## 5. C2 — One module for "add a person to this org"

**Problem.** Four paths create a member. `MembershipMutations` already owns the row insert — but the
*rule* sits above it, so the rule forked. The allowed-domain policy is read at exactly one of the four
(`rg -l organizationAllowedEmailDomains backend/src` → schema, settings CRUD,
`invitation-create.service.ts:151-165` only). `[V]`

**Interface.**

```
admitOne(tx, { orgId, email, role, actor, createUserIfMissing }) → AdmissionOutcome
admitMany(tx, { orgId, candidates[] })                          → AdmissionOutcome[]

AdmissionOutcome =
  | { kind: "admitted";      userId; membershipId }
  | { kind: "needs-restore"; userId; status: "SUSPENDED" | "LEFT" }
  | { kind: "conflict";      reason: "already-member" }
```

One policy for both entry points: domain check → duplicate lookup → membership-status branch → seat lock
**once** → `assertWithinLimit(…, n)` **once** → `MembershipMutations.createMembership(s)`.

### TODO

- [x] Create `modules/organization/core/membership-admission.service.ts` + a thin
      `MembershipAdmissionModule`, so Users and HR import it without pulling all of `organization/core`.
- [x] **Verify placement with `madge --circular` before committing.** If it cycles, move the module to a
      neutral owner — no `forwardRef`, barrel, or pass-through wrapper (root §1.12).
- [x] Implement `admitOne` and `admitMany` over one shared policy path.
- [x] Move the domain check in from `invitation-create.service.ts:151-165`, and **fix its case
      sensitivity** — it lowercases the incoming domain but compares stored values as-is, so a domain
      stored as `Company.com` never matches `alice@company.com`. `[V]`
- [x] Enforce the domain rule on all admission paths (D1). Preserve today's semantics: an empty or unset
      list skips the check entirely; no owner/admin/platform-admin exemption. `[V]`
- [x] `users.service.ts:85-219` → `admitOne`. Keep the `sendInvite=true` short-circuit at `:99-101`.
- [x] `users.service.ts:177` — **stop stamping `emailVerified: new Date()`** at admin-create. Nothing is
      verified at that point; `auth-magic-link.service.ts:150-151` re-stamps on first login anyway. `[R]`
- [x] `employee-onboarding.service.ts:87-245` → `admitOne`. Delete the hand-built advisory lock at
      `:81-84`, a driftable copy of `lockMembersQuota` (`billing/core/seat-definition.ts:35`). HR gains the
      domain check and the restore-aware outcome. `[V]`
- [x] `bulk-onboarding-writes.ts:120-217` + its upstream planner → `admitMany`. The planner's per-row
      duplicate logic moves inside admission.
- [x] Standardise messages on the invite/Users wording (D11); HR's flat
      `"This email already belongs to an employee in your organization."` goes.
- [x] Update `invitations-plan-limit.spec.ts` (exact strings) and `users-seat-limit.spec.ts` (substring).
      They pin wording, not behaviour. `[R]`
- [x] Confirm `employee-bulk-onboarding-query-count.spec.ts` still passes — it pins the one-lock /
      one-assert invariant `admitMany` exists to protect. `[R]`
- [x] Leave invitation acceptance alone (D12), including its deliberate `assertWithinLimit(…, 0)`. `[R]`
- [x] **Full suite** (D18).

**Do not touch:** invite acceptance is already genuinely idempotent — row lock, status re-check,
unique-violation 409 (`invitation-acceptance.service.ts:119-133,369-374`). All four paths are already
transactional and none is missing `assertWithinLimit`. `[R]`

---

## 6. C1 — Collapse org creation onto one definition

**Problem.** Three modules define "an org is created and provisioned", with three different reliability
guarantees. Only `OrgProfileService` runs a compensated, resumable saga.

| Path | Entry | Idempotent | Placement compensated | Provisioning |
|---|---|---|---|---|
| A | `POST /organization` → `org-profile.service.ts:207-367` | ✅ `@Idempotent` | ✅ saga step | one transaction |
| B | `POST /org/setup/complete` → `org-setup-resolver.service.ts:179-258` | ❌ | ❌ | tx + outbox consumer |
| C | `POST /auth/register` → `auth.service.ts:78-160` | ❌ | ❌ | **two separate transactions** |

### TODO — consolidation

- [x] `OrgSetupResolverService.resolveOrCreateOrg` (`org-setup-resolver.service.ts:179-258`) calls the
      saga / `OrgProfileService.bootstrapCellOrganization` instead of hand-rolling its own transaction,
      placement call and role seeding (D13). `[R]`
- [x] `AuthService.register` (`auth.service.ts:78-160`) keeps its own path (D13 — signup latency) but
      loses both defects:
  - [x] Merge the two `withTenant` blocks. `seedSystemRolesForOrg` + `provisionOrgModules` currently run
        in a **second block after the first commits** (`:132-137`), reproducing exactly the
        half-provisioned-org bug the outbox consumer was built to eliminate. `[R]`
  - [x] Compensate `placeOrganization` (`:93-94`) on failure. An unplaced org is a 401 everywhere. `[R]`
- [x] Delete the duplicated `slugify` — `org-setup-resolver.service.ts:57-67` and `auth.service.ts:47-56`
      are verbatim copies. One owner, both import it. `[R]`
- [x] Delete the duplicated create-org-with-trial-subscription logic once both call the saga. `[R]`

### TODO — defects

- [x] **Natural idempotency for `/org/setup/complete` and `/skip`** (D14): short-circuit when the org
      already has `onboardingCompletedAt`, returning the existing result rather than re-running. Today a
      replay re-emits `organization.setup.completed` with `sendWelcome: true` **and** inserts a fresh
      `magicLinkTokens` row (`org-setup.service.ts:139-194`). **Do NOT add `@Idempotent`** — it 400s any
      caller without an `Idempotency-Key` header. `[R]`
- [x] **Delete the false claim** at `organization.controller.ts:188` —
      `@AuthorizedInService("…plan limits enforced in OrgProfileService.createOrganization")`. No such
      enforcement exists; `rg "assertWithinLimit|PlanLimitsService" modules/organization/` returns only a
      spec file. No cap is added (D15); `@UseRateLimit("organization:create")` remains the abuse control,
      and the comment must say that instead. `[V]`
- [x] **Delete the dead third stamp**: `POST /workspace-onboarding/complete`
      (`workspace-onboarding.controller.ts:36-44` → `workspace-onboarding.service.ts:281-288`) is a third
      writer of `onboardingCompletedAt` with zero frontend callers. `[R]`
- [x] **Ownership transfer stale grant**: `membership-mutations.ts:219-245` re-syncs the *demoted*
      member's `role_assignments` row but never the *promoted* one. Not a bypass — `isOwner` is checked
      structurally — but the role-members view misreports. `[R]`

### TODO — wizard orchestration (D17)

- [x] Extend `OrgSetupCompletedConsumerService` to own workspace generation and bulk invites. It already
      owns RBAC seeding, module checklists, session close and the welcome notification, and its own
      comment (`:21-41`) records that a browser-driven `setImmediate` used to half-provision orgs. `[R]`
- [x] `features/org-setup/components/step-generation.tsx` — remove the client-side sequence:
      `buildPayload` (`:94-104`), `runPostSetupTasks` (`:141-182`), the `generationPending` retry state
      machine (`:236-270`). The tab fires one call and polls status. `[R]`
- [x] Keep `hasRunRef`/`apiDoneRef` (`:77-78`) only if still needed for double-invoke under StrictMode;
      delete if the server-side short-circuit makes them redundant.
- [x] **Full suite** (D18).

**Do not build:** an org-count cap (D15), or `@Idempotent` on the setup routes (D14).

---

## 7. C4 — Remove the degrade machinery and the duplicate cache

**Problem.** Two verified defects, neither requiring the seam to move.

**D19 — deny-blindness is deliberately NOT fixed.** `assertModuleEnabled` asks an org-level question at an
org-level gate. Repointing it at the actor-bound resolver would deny an admin who is personally denied
module X the ability to administer module X **for other people** — a privilege regression, not a fix. The
report listed deny-blindness as a defect; this PRD overrides that. Recorded so a future audit does not
read it as an oversight.

### TODO

- [x] `entitlements.service.ts` — remove all four `degrade` branches: `isModuleEnabled` (`:162-168`),
      `getModuleState` (`:180-185`), `effectiveModules` (`:377-378`), and collapse the log ternary
      (`:111`) to the deny wording. `[V]`
- [x] Check whether `moduleTableUnavailable` (`:71`, set at `:107`) becomes write-only. If so, delete it
      and say so in the commit.
- [x] `getModuleState`'s only production caller is `search-scope.ts:23-24`. Confirm the behaviour change
      is acceptable: with `org_modules` missing, search stops including crm/build rather than including
      them. `[V]`
- [x] `env.validation.ts` — delete `RBAC_MIGRATION_MODE` (`:78`) and its production `superRefine`
      (`:365-371`). Safe: the env schema has **no** `.strict()` or `.catchall()`, so Zod strips unknown
      keys and a deployment still setting the var is ignored rather than failing at boot. `[V]`
- [x] `.env.example:6` — remove the line. `[V]`
- [x] Remove `env.validation.spec.ts:196-208` and the parametrised `migrationMode` cases in
      `entitlements.service.spec.ts:128`. `[R]`
- [x] `user-module-access.service.ts` — delete `deniedModulesCache` (`:25-28`), `clearCacheForMember`
      (`:203`) and the zero-caller `clearCacheForOrg` (`:36-41`). The write path at `:159-201` bumps the
      version and busts Redis but never clears this map; only the no-op core-module branch at `:155` does,
      so an admin can read up to 15 s of stale denial state. `[V]`
- [x] Read denials through `DeniedModulesResolver`, which keys on the version and self-heals. `[V]`
- [x] Expect churn across the ~28 spec files that stub `isModuleEnabled`; `module-access-preservation.spec.ts`
      stubs it at six sites. `[R]`
- [x] Typecheck + gates only (D18).

**Do not do:** move the seam onto `AuthContext.moduleAvailable()`. **Do not re-raise:** the two
module-key vocabularies (`namespaceOf` vs `administeringModuleOf`) are a deliberate, guarded split. `[R]`

---

## 8. C5 — One owner for the session-claims refresh

**Problem.** Permissions are fresh within 30 s — the globally mounted sidebar polls `/me/access`
(`app-sidebar.tsx:93-96`). Session claims are not: `SessionProvider` sets `refetchInterval={0}`
(`session-provider.tsx:53-57`), so `orgId`, `role`, `isOrgOwner`, `plan` and the onboarding stamps refresh
only on window blur→focus, a new server render, or one of 13 hand-rolled `update()` calls. A focused tab
that never blurs holds them indefinitely. `[V]`

The backend is not at fault: `user:session:<userId>` is busted on every relevant write, and
`resolveSessionClaims` (`auth-claims.ts:66-93`) always prefers fresh backend data over the token. `[R]`

### TODO

- [x] Add `useSessionClaimsRefresh()` to `hooks/common/auth-hooks.ts` — `update()` +
      `clearBackendTokenCache()` + the 18 s timeout guard that today exists only in
      `lib/onboarding-gate.ts:46-58`. Model it on `useSwitchOrg` (`:218-239`), the one complete site.
- [x] Repoint all 13 call sites: `org-danger-zone-dialogs.tsx`, `org-danger-zone-section.tsx`,
      `leave-organization-control.tsx`, `archived-orgs-restore.tsx`, `suspended-access-card.tsx`,
      `settings-profile.tsx`, `settings-edit-name-form.tsx`, `step-review.tsx`, `step-generation.tsx`,
      `invitation/[token]/page.tsx`, `org-setup/page.tsx`, `hooks/api/ownership.ts:131`,
      `lib/onboarding-gate.ts`. `[R]`
- [x] **Piggyback (D8):** a hook in the authenticated layout watching the access `version` the sidebar
      already fetches; on change, call the refresh. **Zero new requests.**
- [x] **Backstop (D8):** `SessionProvider` gets a 5-minute `refetchInterval` for claims no version bump
      covers — plan changes, org rename.
- [x] **Eviction (D9):** move `useHomeCacheSync` out of `dashboard-client.tsx:83` into the authenticated
      layout and widen it beyond the dashboard namespace. Today `useCan` flips and the UI hides, but
      cached data is never evicted — `enabled: false` stops refetching, it does not evict. `[R]`
- [x] Delete the dead key factory `hr.leaveBalance` (`lib/query-keys/human-resources.ts:21-24`) — no hook
      reads or invalidates it; the live path is `collaborationQueryKeys.dashboard.myLeaveBalance()`. `[R]`
- [x] Typecheck + gates only (D18).

**Do not do:** a blanket session poll as the primary mechanism. **Checked, no defect found:** six hook
families were sampled for missing or under-dimensioned invalidation; all used correct prefix invalidation.
Recorded as checked-not-found rather than filled with guesses. `[R]`

---

## 9. C3 — Hierarchy skeleton and dead-surface removal

**Problem.** Six kinds are already one table (`orgUnits`, discriminated by `kind`) served by six
near-identical CRUD implementations behind one facade, plus two families of dead routes and 18
invalidations of a cache namespace nothing populates.

### 9.1 Why C6 is moot, not deferred

`createBusinessUnitSchema` and `updateBusinessUnitSchema` are both `.strict()` and carry **no `parentId`
field** (`dto/org-hierarchy.schemas.ts:22-41`). A business unit's parent can only be set through the move
route. BUSINESS_UNIT is the only kind that may parent its own kind, so deleting the move routes makes the
BU→BU cycle **structurally unconstructible**. Branch, department and team set their parent at
create/update but are cross-kind, so no cycle is possible there. `[V]`

**Accepted cost:** move is the only way to nest business units at all — the UI has never been able to,
since the create/update schemas lack the field. Orgs with already-nested BUs keep that data; it becomes
read-only.

### TODO — consolidation

- [x] Extract the identical skeleton into one base: cursor list
      (`getOrgUnitCursorFilter`/`toOrgUnitCursorPage`), code-uniqueness conflict, soft-delete/retire,
      audit, cache call.
- [x] Convert the six services to thin adapters supplying kind, projected columns, joins, parent rule
      (absent / optional / required), parent kind, and code strategy (D5).
- [x] Preserve the kind-specific behaviour the base must not swallow: branches resolve
      `managerUserId`→membershipId and carry an address bundle; departments resolve `headUserId`; teams run
      `assertDepartment` + `assertActiveLead` and require a non-null parent; locations auto-generate `code`
      from the name and have no `parentId`; cost-centers have neither parent nor move. `[R]`

### TODO — deletions

- [x] Delete the six `DELETE /org-hierarchy/<kind>/:id` routes (D4). Zero frontend callers, no restore
      path, reachable by any holder of `settings:organization:manage` — contrary to root §8. `[V]`
- [x] Delete the four move routes and `OrgHierarchyMovesController` (D3). Only 4 of 6 kinds have one. `[R]`
- [x] **Port, do not delete,** `org-hierarchy-branches-tenant-isolation.spec.ts:190-204` — re-point its
      cross-tenant assertion at the surviving archive path. Losing a BOLA test alongside its route is a
      coverage regression. `[R]`
- [x] Update `org-hierarchy.service.spec.ts`, which unit-tests the deleted `delete*`/`move*` facade
      methods extensively (~`:223-330`). `[R]`
- [x] Delete the 18 `cache.invalidateForOrg(orgId, "org:units:<KIND>")` call sites.
      `rg "cachedForOrg|cachedVersioned"` in the hierarchy module returns **zero** — nothing populates that
      namespace. `[V]`
- [x] Correct `common/cache/cache-invalidation-matrix.ts:121-126`, which documents `org:units:<orgId>` as
      a live `cachedForOrg` cache. That documentation is stale. `[V]`

### TODO — gates

- [x] **Hand-edit** `backend/src/scripts/baselines/authz-deny.json`: remove the 10 listed handlers,
      `gatedHandlers` 3249→3239, `uncovered` and `uncoveredRatchet` 2231→2221. **Do not run
      `--emit-baseline`** — it re-measures everything and can silently raise a floor meant only to walk
      down. `[V]`
- [x] Regenerate `openapi.json` and re-vendor to `frontend/contracts/`. Operation ids removed:
      `OrgHierarchyController_delete{OrgBranch,BusinessUnit,CostCenter,Department,Location,Team}` and
      `OrgHierarchyMovesController_move{Branch,BusinessUnit,Department,Team}`. `[R]`
- [x] Re-check `check-settings-route-e2e-coverage.mjs:76`, which lists `org-hierarchy.controller.ts` at
      file level. `[R]`
- [x] **Full suite** (D18).

**Confirmed sound, do not "fix":** no N+1 — the whole tree is one query
(`org-hierarchy-tree-source.service.ts:145-178`), dependency counts are one `UNION ALL`; all 12 frontend
mutation hooks invalidate `hierarchy.all`; the parent selector filters to ACTIVE and non-deleted on both
sides. No API-token, public, portal or MCP surface exposes hierarchy mutations. `[R]`

---

## 10. C7 — Schemas to their owners

**Scope (D16):** the 54 non-trivial controller schemas, the two misplaced files, and payroll's parallel
interfaces. **Explicitly excluded:** the 173 trivial single-field param guards (permitted by root §6) and
the 174 frontend inline `.tsx` schemas (already declared acknowledged legacy drift in
`frontend/CLAUDE.md` §6, with "new code adds none").

### TODO — controller schemas → `dto/`

- [x] Move the **54** multi-field request/body `const xSchema = z.object(...)` declarations out of **32**
      controllers into their module's existing `dto/*.schemas.ts`. Type via `z.infer`, never a parallel
      interface. `[R]`
- [x] Worst offenders first: `ai/core/controllers/crm-copilot.controller.ts:52,57,64,68,73,84,89`
      (7 schemas) · `hr/settings-hub/hr-settings-hub.controller.ts:16,25,44,57,69` (includes a schema
      **nested inside another** at `:27`) · `access/entitlements.controller.ts:17` (`toggleModuleSchema`) ·
      `workflows/workflows.controller.ts` · `crm/metadata/crm-metadata.controller.ts:44-50`. `[R]`
- [x] Leave the 173 single-field `...Params` one-liners inline (root §6 exception). `[R]`

### TODO — misplaced files

- [x] Split `modules/dashboard/dto/dashboard-misc-response.schemas.ts:11-185` — it holds **HR** schemas
      (`leavesTodaySchema`, `myLeaveBalanceSchema`, `upcomingHolidaysSchema`) and **Build** schemas
      (`myIssuesSchema`, `activeSprintSchema`, `recentProjectsSchema`), none owned by dashboard. Move each
      to its owning module. `[R]`
  - [x] **Check `scripts/check-dead-code.mjs` first** — it carries a reasoned KEEP verdict for
        `dashboard-misc-response.schemas.ts:teamAvailabilitySchema|teamAttendanceSchema`. The ledger is the
        authority; update its path entries rather than tripping it. `[R]`
- [x] Split `db/schema/hr/offboarding.ts` — it holds four **onboarding** tables (`onboardingTemplates:74`,
      `onboardingTemplateSteps:89`, `onboardingTasks:109`, `onboardingDocuments:189`) beside the genuine
      offboarding tables. `documentTemplates:14` and `documentTypes:158` are used by both flows and belong
      in a neutral file. `[R]`
  - [x] **This is a schema file move, not a deletion.** Before moving, `rg` the **path** as well as the
        symbols — a spec may pin the literal file path. No table is renamed and no migration is generated;
        `pnpm -C backend db:generate` must report **no diff**. Verify that before committing.
- [x] Do **not** touch `db/schema/hrms-phase1-sql-managed.ts` or its siblings — deliberately unimported
      and asserted by `migration-integrity.spec.ts`. `[R]`

### TODO — parallel interfaces → `z.infer`

- [x] `timesheets/payroll/dto/payroll.schemas.ts` — `PayrollSummaryRow` (`:100-117`) shares 12 fields with
      `payrollExportRowSchema` (`:119-135`), which already exposes `PayrollExportRow = z.infer<…>` at
      `:139`. Also `TimesheetExportDto` (`:141`) and `PayrollSettingsDto` (`:158`, duplicating
      `updateSettingsSchema` at `:85`). Derive all three. `[R]`
- [x] Same shape flagged but not individually read — re-verify before acting: `mail/dto/mail-schemas.ts:76-116`,
      `finance/reports/dto/insights.schemas.ts`, `inventory/ai/dto/ai-insights.schemas.ts`,
      `crm/core/dto/crm-org-insights-response.schemas.ts`. `[R]`
- [x] Typecheck + gates only (D18).

**Explicitly not in this candidate:** the ~1,100–1,300 `apiClient.get<T>()` call sites that pass a type
parameter with no runtime contract — a cast, not validation. Real, already on record, and a programme in
its own right. Folding it in would swamp C7. `[R]`

---

## 11. Defect ledger — traceability

Every row of the report's ledger, and where it is now handled. Nothing is dropped.

| # | Defect | Weight | Handled in |
|---|---|---|---|
| 1 | Allowed-email-domain bypassed on 3 of 4 paths | High | §5 C2 |
| 2a | Module gate keeps a `degrade` fail-open | High→**Low** (§3) | §7 C4 |
| 2b | Module gate ignores per-user denies | High | **§7 D19 — deliberately not fixed** |
| 3 | Six hard-delete hierarchy routes, contrary to §8 | High | §9 C3 |
| 4 | Org creation has no plan limit, comment claims one | Med | §6 C1 (D15 — comment fixed, no cap) |
| 5 | `/org/setup/complete` replayable | Med | §6 C1 (D14 — natural idempotency) |
| 6 | Orphaned placement on setup / register failure | Med | §6 C1 |
| 7 | `deniedModulesCache` never cleared on the write path | Med | §7 C4 |
| 8 | BU→BU reparenting accepts a cycle | Med | §9.1 — **moot** once move routes go (D3) |
| 9 | 18 dead `org:units:*` invalidations + stale matrix doc | Low | §9 C3 |
| 10 | Ownership transfer leaves promoted owner's grant unsynced | Low | §6 C1 |
| 11a | Dead: `POST /workspace-onboarding/complete` | Low | §6 C1 |
| 11b | Dead: 4 move routes | Low | §9 C3 |
| 11c | Dead: `hr.leaveBalance` key factory | Low | §8 C5 |
| 11d | Dead: `clearCacheForOrg` | Low | §7 C4 |

**Reported but not found — no work, do not re-open** (§"Reported, but not found" in the HTML): typecheck
is clean in both repos; no N+1 in the audited paths; backend cache invalidation is the strongest layer in
the repo (declared matrix + CI gate); Home's ~12 queries are already staged behind dynamic imports and an
`IntersectionObserver`. The genuine always-on request cost is the sidebar's 30 s `/me/access` poll plus
unread counts — addressed by D8's piggyback, which adds nothing to it.

## 12. Validation

Run before any candidate is marked done:

- [x] `pnpm -C backend typecheck` — 0 errors
- [x] `pnpm -C frontend type-check` — 0 errors
- [x] `madge --circular` — zero cycles, **both** repos
- [x] `openapi:check` (C3)
- [x] `check:authz-deny` (C3)
- [x] `check:cache-invalidation` (C3, C4)
- [x] `check:dead-code` (C7)
- [x] `pnpm -C backend db:generate` reports **no diff** (C7 schema file move)
- [x] Update `frontend/PAGES.md` where a page's behaviour changed (C1, C5)

**Test suite (D18):** full suite on **C1, C2, C3**. Typecheck + gates only on C4, C5, C7. Lint is **not
run** and is reported as not run, never as passing.

Baseline at approval, measured this session: backend `tsc` **0 errors**, frontend `tsc` **0 errors**. `[V]`

## 13. Completion log

**Do not delete an item to close it — mark it done and cite the evidence.**

| Candidate | Status | Notes |
|---|---|---|
| C2 — member admission | **DONE** | `membership-admission.service.ts` owns the one policy path; all 4 writers migrated |
| C1 — org creation | **DONE** | setup → shared bootstrap, register fixed in place, natural idempotency, wizard sequencing moved server-side |
| C4 — degrade + cache | **DONE** | 4 branches + env var deleted; `deniedModulesCache` replaced by `DeniedModulesResolver` |
| C5 — session claims | **DONE** | `useSessionClaimsRefresh` owns all 13 sites; version piggyback + 5-min backstop; eviction app-wide |
| C3 — hierarchy | **DONE** | shared skeleton + 6 adapters (1,749 → 1,328 + 127 base); 10 dead routes deleted |
| C7 — schemas | **DONE** | 53 controller schemas → `dto/`; 2 files split; payroll interfaces → `z.infer` |
| C6 — ancestry | **CLOSED AS MOOT** | §9.1 — BU parent settable only via the deleted move route, so the cycle is unconstructible |

### Second pass — 2026-09-11, delta audit of all 78 items

Seven read-only agents re-verified every unchecked item against current source. Line numbers in this
document are from the baseline commit and had drifted, so everything was located by symbol, not by line.

**Verified already done, no work needed:** C2 in full (the admission service owns one policy path, the
domain check is case-insensitive on both sides, all four writers call it), C4 in full (`degrade` and
`RBAC_MIGRATION_MODE` gone repo-wide, denials read through `DeniedModulesResolver`), C5 in full (the shared
refresh hook owns all 13 sites, the version piggyback adds zero requests), C7's file splits and `z.infer`
work, and C3's consolidation and dead-route removal.

**Found genuinely incomplete, and closed in this pass:**

| # | Gap | Why the first pass missed it | Commit |
|---|---|---|---|
| 1 | `AuthService.register` still hand-inserted a duplicate trial `subscriptions` row | The TODO's own precondition — "once both call the saga" — can never be met, because D13 says register keeps its own transaction. The item was unclosable as written. | `insertTrialSubscription` in `billing/core/` |
| 2 | Every org unit list and get was uncached | C3 deleted the 18 dead `org:units:*` invalidations and correctly documented the namespace as dead, but nothing replaced it. "No cache to invalidate" was read as "nothing to do". | `02579267c` |
| 3 | Three inline controller schemas remained | The original count of 54 conflated 2-field route **param** guards with body/query schemas. The real remainder was 3. | `7ef41f9a3` |

**Not in the plan, done because CLAUDE.md required it:** `organization.controller.ts` was 537 lines — past
§7's 500-line hard-review limit — holding seven concerns. Split into five controllers (`75722f105`).

**A measurement correction:** the schema scan that produced "54 schemas in 32 controllers" counted
multi-segment param guards like `projectAndTicketIdParams` as violations. They are the direct analogue of
the single-field guards §6 exempts. Of 658 inline declarations across 554 controllers, **125 are
multi-segment param guards and 3 were real**. The honest remaining figure was never 54.

### Verification — measured 2026-09-11, tree quiesced

| Gate | Result |
|---|---|
| backend `tsc --noEmit` (build) | **0 errors** |
| backend `tsc --noEmit` (test config) | **0 errors** |
| frontend `tsc --noEmit` | **0 errors** |
| backend full suite | **2,211 suites passed, 0 failed** (1 skipped, 19,209 tests) |
| frontend targeted suites | 19 passed, 126 tests |
| `madge --circular` backend (`src` + `test`) | **zero cycles**, 6,667 files |
| `madge --circular` frontend | **zero cycles**, 5,883 files |
| `openapi:check` | current — **3,654 operations, 3,654 exposure-stamped** |
| `check:contract-vendor` | frontend copy matches backend byte-for-byte |
| `check:authz-deny` | OK — uncovered 2196 (ratchet 2221) |
| `check:cache-invalidation` | LOW-only, 0 documentation gaps |
| `check:baseline-integrity` | 0 unregistered, 0 stale, none moved unsafely |
| `check:permission-keys` | OK both directions |
| `check:route-classification` | ALL ROUTES CLASSIFIED |
| `check:settings-route-e2e-coverage` | 150/150 (100%) |
| frontend `check:response-contracts` | 2,713/2,713 parsed |
| frontend `check:dead-code` · `check:contract-drift` | PASS · PASS |
| Drizzle schema move | **16 tables, identical column/constraint bodies** — no migration generated |

**Lint: not run.** Never requested; reported as not run, never as passing.

### Re-verification after the second pass — measured 2026-09-11

| Gate | Result |
|---|---|
| backend `tsc --noEmit` (build) | **0 errors** |
| backend `tsc --noEmit` (test config) | **0 errors** |
| frontend `tsc --noEmit` | **0 errors** |
| **backend full suite** | **2,217 suites passed, 0 failed** (1 skipped, 19,233 tests) |
| `madge --circular` backend (`src` + `test`) | **zero cycles**, 6,681 files |
| `madge --circular` frontend | **zero cycles**, 6,025 files |
| `openapi:check` | current — **3,654 operations**, 3,649 with a zod contract, 3,654 exposure-stamped |
| `check:contract-vendor` | byte-match, sha256 `91578da385713ea5…` |
| `check:authz-deny` | OK — uncovered 2196, **ratchet banked to 2196** |
| `check:baseline-integrity` | 174 registered, 0 unregistered, 0 stale, none moved unsafely |
| `check:cache-invalidation` | LOW-only, 0 documentation gaps |
| `check:permission-keys` · `check:route-classification` | OK both directions · ALL CLASSIFIED |
| `check:settings-route-e2e-coverage` | **16/16 controllers, 150/150 routes** after the split |
| `check:dead-code` (backend) | knip 0 unused files; ledger 15 verdicts, 0 stale |
| frontend `check:response-contracts` | 2,713/2,713 parsed |
| frontend `check:dead-code` · `check:contract-vendor` | PASS · PASS |
| Controller split — route parity | **31 routes before, 31 after**; all 31 handler-level decorator sets identical |
| Controller split — OpenAPI | 10+5+4+3+9 = **31 operations**, **0 duplicate operation ids** |
| Inline controller schemas | **0** multi-field body/query schemas across 554 controllers |
| Hierarchy cache spec | 6 tests, **2 constructed bites proven to fail** when the key loses a filter |

**Lint: still not run.**

### Found during execution — not in the original plan

- [x] **Two more §8-violating hard-delete routes.** `DELETE /hr/org/locations/:locationId` and
      `DELETE /hr/org/teams/:teamId` (`hr-org-structure-compat.controller.ts`) called the deleted facade
      methods and were the same violation as the six the PRD named — simply missed because they live in
      the HR namespace. Deleted; the permission-boundary assertion was ported to the surviving archive path.
- [x] **`check-settings-route-e2e-coverage` was already RED at baseline** (ratchet 159 vs 156 routes at
      100% coverage) — a pre-existing break from the earlier moves-controller split, not caused by this
      work. Ratchet corrected to the true 150.
- [x] **Two audit gates were blind to an extracted helper.** After `recordOrgUnitAudit` was extracted, the
      text scans in `hrms-critical-audit-invariants.spec.ts` and `audit-attribution.spec.ts` could no
      longer see 12 audit writes that were still being made and awaited. Rather than re-pin the count, the
      scanner now follows one hop — the same fix this repo applied to `classifyBulkMethod`. It carries 10
      self-tests including 4 constructed bites, and a helper that fails to await now taints every call site
      that reaches it. **Net: the gates see 13 writes they previously could not, including one in
      `work-logs.service.ts` that was outside every gate.**
- [x] **HNSW iterative-scan guard** — the BOLA scan lost sight of it when the KB vector query moved file.
      Guard verified still present and ordered before the ANN query; scan taught to follow the move.
      Constructed bite: deleting the `SET LOCAL` line fails 2 tests.
- [x] **`auth.service.register` was writing two different slugs** — `slugify()` appends `Date.now()` and
      was called twice, so `account_organization_index.organization_slug` could carry a slug the
      organization never had. Fixed as a side effect of the dedup.
- [x] **HR onboarding's org-unit placement was a silent no-op** — `syncOrgUnitPlacement` ran *before* the
      membership existed, and that helper skips when it finds no membership. It now runs after admission
      and actually writes.

### Closed in the 2026-09-11 finish-up pass

- [x] **`authz-deny` headroom banked.** `uncoveredRatchet` lowered 2221 → the measured 2196 in both
      `baselines/authz-deny.json` and `baselines/ratchets.json`. This tightens the gate — fewer uncovered
      handlers are now permitted — so it is not the forbidden direction. `check:baseline-integrity` had
      been reporting the gain as unbanked.
- [x] **`generateWorkspaceResponseSchema` now declares `z.number()`** on all four fields
      (`dto/workspace-onboarding.schemas.ts:13-18`), matching what the service returns. Fixed in `96225ca4e`.
- [x] **Org unit reads are cached.** C3 consolidated the hierarchy but left every list and get going to
      Postgres on every request. Now version-keyed under `org:hierarchy` — see §9 above.
- [x] **The last three inline controller schemas moved to their `dto/`.** A scan of all 554 controllers
      reports zero multi-field request/query schemas declared inline. See §10.
- [x] **`organization.controller.ts` split** — 537 lines and seven concerns became five controllers on the
      same route prefix, with all 31 handler-level decorator sets proven identical.

### Still open — deliberately

- [ ] **Deny-blindness (ledger 2b)** — not fixed, per D19. Recorded as a decision, not an oversight.
- [ ] **`DependencyMode = "retire"`** is now unreachable from production but still accepted by
      `GET /org-hierarchy/dependencies/:kind/:id?mode=retire`, with two specs asserting it. Removing it is
      a capability deletion this PRD did not authorise.

### Correction to this document

- **The `src → test` import is NOT the first such edge — that claim was wrong.** Measured 2026-09-11:
  **189** files under `backend/src` already import from `test/helpers`, a long-established convention
  (`membership-state-stub.ts`, `mfa-policy-stub.ts`, `user-module-access-stub.ts`). The
  `hrms-critical-audit-invariants.spec.ts` edge needed no special justification, and
  `test/helpers/org-hierarchy-cache-stub.ts` follows the same convention rather than setting a precedent.
  The rest of the original note still holds: `tsconfig.build.json` excludes `**/*spec.ts` and `test`, so
  nothing reaches `dist`, and madge confirms no cycle.
