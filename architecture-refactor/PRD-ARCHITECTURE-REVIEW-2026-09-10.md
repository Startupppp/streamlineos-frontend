# PRD — Architecture review 2026-09-10: org · login · access · RBAC · settings · module access · API cost

Status: **COMPLETE** · Baseline commit `db887baad` · Source: architecture review run 2026-09-09/10
Scope approved by the owner: **all eleven candidates**. All eleven are closed.

## Outcome

| | |
|---|---|
| **Built as specified** | C1 · C2 · C4 · C7 · C8 · C9 · C10 · C11 |
| **Built differently, because the card was wrong** | C3 (blocker was false — nothing needed porting) · C6 (the backend half would have been a security regression) |
| **Deliberately NOT built, on measurement** | C5 (both prohibitions target legitimate, load-bearing operations) · `useSettingsSectionForm` (deletion test fails) |

**Gate at sign-off — re-run 2026-09-10 after the follow-up pass, and the backend is now FULLY GREEN.**
Backend: `tsc --noEmit` **0 errors** · `madge` **zero cycles** · `check:route-classification` **ALL ROUTES
CLASSIFIED, 0 undeclared** · `check:permission-keys` **OK both directions** · `openapi:check` **current,
3,667 operations, 3,667 exposure-stamped** · full suite **2,201 / 2,201 suites, 18,996 passed, 0 failed**
(1 suite skipped, 46 tests skipped, 1 todo). Frontend: `tsc --noEmit` **0 errors** · `madge` **zero
cycles** · `check:contract-vendor` **matches** · full suite **466 / 466 suites, 4,776 / 4,776 tests**.
Lint **not run** — it was never requested.

The 5 suites that were red at first sign-off are all closed: 2 were a **stale `openapi.json`** still
carrying routes C3 had deleted, 1 was a spec asserting a defect that had since been **fixed**, 1 was
wall-clock flake now driven by fake timers, and the census rework turned up **a real cross-tenant write**
on `POST /crm/ingress/inbound`.

**Seven lane verdicts were wrong and were corrected by hand** — the pattern is worth keeping: a lane
that must not cross a file boundary will rationalise a duplicate, and a lane reading one file in
isolation will call a facade's behaviour missing. Every correction is recorded inline below.

Not a lane file. Deliberately **outside** `architecture-refactor/prd/`, because
`frontend/scripts/check-prd-traceability.mjs` reads `architecture-refactor/prd/**` and fails an
unindexed lane. No `PRD-Cnnn` id is created or renumbered here.

**Evidence grade** on every item: `[V]` = verified by reading the cited lines in this session ·
`[R]` = explorer-reported with line anchors, not independently re-read. Re-verify `[R]` before acting.

---

## Execution waves

Candidates are parallelised only where they share no file. The collisions that forced waves:

| Collision | Files | Resolution |
|---|---|---|
| C7 ↔ C8 | `frontend/hooks/api/access.ts` | C8 owns it in wave 1 (2-line refetch fix); C7 waits |
| C2 ↔ C11 | `backend/src/modules/auth/auth.service.ts` | C11 in wave 1; C2 waits |
| C6 ↔ C1 | `modules/access/access-policy.ts` vs the C1 spec lane asserting `moduleOf` | C6 waits until C1 is green |
| C5 | 54 call sites, 30 resolvers | never a parallel lane — its own program |

- **Wave 1 — DONE:** C1 · C4 · C8 · C11 (C3 moved out: its blocker turned out to be false, and it was
  finished by hand alongside wave 2).
- **Wave 2 — DONE:** C6 · C7 · C10.
- **Wave 3 — DONE:** C2 · C9.
- **Wave 4 — CLOSED WITHOUT BUILDING:** C5, on measurement. See its section.

Waves held: three agents at a time at most, each with an exclusive file list, and the gate run once per
wave with the tree quiesced. Two collisions predicted in the table below were real (C7↔C8 on
`hooks/api/access.ts`, C6↔C10 both under `features/settings/`) and were resolved by ownership rather
than by serialising the whole wave.

Gate runs ONCE per wave, quiesced. No agent runs `tsc`, a build, tests, madge, knip or git —
measuring a tree while agents are editing it produces numbers that were never true.

## Sequencing

| Order | Candidate | Why here |
|---|---|---|
| 1 | C1 AuthContext | in progress; owns the guard chain, do it while it is loaded |
| 2 | C4 Support automations | near-free, backend already built |
| 3 | C3 Branch mutations | deletes a whole write path |
| 4 | C6 Module vocabulary | small, and C7 touches neighbouring code |
| 5 | C7 Frontend module-enabled | same area as C6 |
| 6 | C8 Settings prefetch + refetch | independent, high call-count win |
| 7 | C10 Settings section shape | large but mechanical |
| 8 | C2 Session claims | touches login; do it alone |
| 9 | C9 Membership write + bust | correctness-adjacent, needs care |
| 10 | C11 Auth facade deletion | pure cleanup, do last |
| 11 | C5 DataScope | largest migration; own program |

---

## C1 — One request-auth context · **DONE (wave 1)**

Full decision record and lane checklist: **[PRD-AUTH-CONTEXT.md](PRD-AUTH-CONTEXT.md)**. Do not
duplicate its todos here. Summary of what it closes: `module.guard.ts:46` and `authorize.ts:34`
resolved module availability twice per request through resolvers that diverged in degrade mode. `[V]`

- [x] Every lane in `PRD-AUTH-CONTEXT.md` complete
- [x] Its gate section passed — and found **34 arity errors across 14 spec files** the lanes had missed,
      plus the `test/security/**` typecheck blind spot that hid three more

---

## C2 — One resolver for the session claims shape · **DONE (wave 3)**

- [x] Counts corrected: **13** fields, **6** defaulting sites (not ~14 / 11) — `signIn()`, the `jwt()`
      user block, the `jwt()` trigger-update block, both `session()` paths, and
      `buildUserFromSessionData`. `orgOnboardingCompletedAt`'s 9 appearances checked out: 6 runtime + 3
      type declarations.
- [x] Catch-path drift confirmed and **worse than the card said** — missing `authProvider` and
      `session.user.image` as well as `plan` and `enabledModules`. All now fixed by construction.
- [x] `SessionClaims` defined once in NEW `frontend/lib/auth-claims.ts`; `next-auth.d.ts` now says
      `SessionClaims["field"]` instead of restating each type
- [x] `resolveSessionClaims(fresh, token)` — pure, no NextAuth import, no I/O. All six sites call it.
- [x] Dead JWT fields removed from the augmentation: `plan`, `enabledModules`, `image` were typed on the
      JWT but never written to it or read from it
- [x] 39 unit tests. They bite by construction: every "fresh wins" case supplies a **different** value in
      the token for the same field, so an inverted rule surfaces the token value and fails.
- [x] `fetchSessionDataWithCache(userId, _orgId)` — parameter dropped. It was never read, the backend
      endpoint takes no org argument, and React `cache()` resets per request, so it was inert even as a
      key. Not left as an `^_` escape, which §6 records as the reason unused-symbol enforcement is off.

**Orchestrator corrections:**
- [x] **The lane's own test caught a bug in the lane's own resolver, and the resolver was wrong.**
      `fresh?.x ?? token.x` conflates "the fetch failed" with "the fetch returned null for this field",
      so a user who cleared their avatar, lost their role or left their org kept the **stale token
      value** until re-login — while `name`, `isOrgOwner` and `isActive`, written as
      `fresh ? fresh.x : token.x`, updated immediately. The original code had the same split, so the lane
      preserved it faithfully; but its own precedence table and tests both state the intended rule.
      Unified on "fresh wins entirely when present". Safe because the backend is authoritative for all of
      these — permissions come from `GET /me/access` and membership is re-checked on the JWT exchange —
      so the session copy is advisory.
- [x] **`session.branchId` deleted as dead.** The lane reported it as a frontend/backend mismatch to
      escalate. Checked: the backend session payload carries `cellId: string | null`
      (`auth.service.ts:449`, `auth-response.schemas.ts:53`) and has **no** `branchId` at all, so the
      field was written as a constant `null` at three sites and read at **zero**. Not a mismatch to
      reconcile — dead surface. Removed from `SessionClaims`, `SessionData`, `next-auth.d.ts`, both
      `session()` paths, `signIn()` and the test.
- [x] **CLOSED 2026-09-10 — both halves, not either/or.** Backend: `EFFECTIVE_PLANS` is now a tuple in
      `plan-entitlements.constants.ts` (`EffectivePlan` derives from it), and `authSessionDataResponseSchema`
      is `z.enum(EFFECTIVE_PLANS).nullable()`. The `ResponseContractInterceptor` validates it under test, so
      the producer can no longer emit an unrecognised plan. Frontend: `unwrapBackend<SessionData>` was a
      **cast**, so the union was a claim rather than a fact — `fetchSessionData` now `safeParse`s against
      NEW `lib/auth-session-schema.ts` and falls back to the existing "no fresh data" path. `SessionData` is
      `z.infer` of that schema, deleting the hand-written parallel interface.
- [x] **Found while doing it:** `getSessionData` restated all 17 fields of the response schema as an inline
      return type — a parallel shape free to drift. It now returns `AuthSessionData = z.infer<…>`.

---

## C3 — One owner for branch mutations · **UNBLOCKED 2026-09-10 — the blocker was itself wrong**

⚠ **Two corrections, in sequence.** The review card said `OrgHierarchyBranchesService` is "strictly the
deeper module"; the retirement lane said the live path is weaker on three counts and stopped. **The lane
was wrong on two of its three counts, and its third count should not be acted on.** Verified by hand
this session, reading the facade and the controller rather than the entity service alone. `[V]`

| Lane claim | Verdict | Evidence |
|---|---|---|
| Live path never calls `hierarchyCache.invalidateAfterMutation` | **FALSE** | It does — one level up. `OrgHierarchyService.mutateHierarchy` (`org-hierarchy.service.ts:62-67`) wraps the mutation and invalidates; branch create/update/delete/move all route through it (`:187,195,214,221,234`), and the controller calls the facade (`org-hierarchy.controller.ts:216,228,239`). **Zero** of the six hierarchy entity services invalidate — that is the design, not a branch bug. The lane read the entity service in isolation. |
| Manager lookup outside the transaction ⇒ partial write | **FALSE** | Each of create, update and delete performs **exactly one** write (`insert orgUnits` / `update orgUnits` / soft-delete `update`). A single statement is atomic; a transaction adds nothing. The read-then-write is a benign TOCTOU on `organizationMembers`, whose worst case is an FK error, never a half-applied mutation. |
| Live path never calls `syncOrgUnitPlacement` | **TRUE — and must stay that way** | See below. |

### Why `syncOrgUnitPlacement` must NOT be ported
`sync-org-unit-placement.ts:57-71` **deletes every existing BRANCH placement row** for that person
before inserting the new one. So porting it would mean: naming someone branch manager silently
relocates them out of whatever branch they actually belong to. That is a destructive behaviour change
smuggled in as a refactor, and it has never run in production — the routes that call it have zero
callers. Headship is already recorded correctly and non-destructively by `headMembershipId` on the
`orgUnits` row, which the live path does write. Placement belongs to user/employee management
(`user-ops.service.ts`, `bulk-onboarding-writes.ts`), not to naming a branch head.

### The HR-contact field is not a capability loss either
`hrContactUserId` is written **only** by the dead `BranchesService` (`:47,123`) and read only by the
read-only `branches-read.service.ts`. `frontend/.../hierarchy/branch-form-schema.ts` and
`branches-page.tsx` offer **no HR-contact field at all** — only `managerUserId`. Nothing live writes it
today, so deleting the dead write path removes nothing a user can currently reach.

Caller evidence stands: **zero** production callers of `POST|PATCH|DELETE /branches`. The branches page
uses `org-hierarchy` (`frontend/hooks/api/org-hierarchy.ts:256,266`); `hooks/api/branches.ts:21` is a
read-only `GET`. No cron, worker, seed or script touches the mutations.

What only `BranchesService` (the DEAD path) does:

| Behaviour | `BranchesService` | `OrgHierarchyBranchesService` (LIVE) |
|---|---|---|
| `syncOrgUnitPlacement` — manager | yes | **no** |
| `syncOrgUnitPlacement` — HR contact | yes | **no** |
| `syncOrgUnitPlacement` — clear old on update/delete | yes | **no** |
| `hierarchyCache.invalidateAfterMutation` | yes | **no** |
| Whole mutation in one transaction | yes | **no** — manager lookup sits outside |
| Conflict check on `code` | no | yes |
| Audit log | no | yes |

### Blast-radius check, done — DataScope `team` does not depend on this
- [x] `applyScope` (`apply-scope.ts:22-27`) never queries `org_unit_members`; it consumes a `teamIds`
      array the caller supplies. The only place that derives `teamIds` from `orgUnitMembers` is
      `hr-policy-evaluation.service.ts:341`, which reads a **person's own** placement — set by employee
      management, not by branch headship. So an unported `syncOrgUnitPlacement` cannot widen or narrow
      anyone's DataScope. No authorization consequence.

### Retire the duplicate — nothing to port first
- [x] Port `syncOrgUnitPlacement` — **deliberately NOT done**, reasoning above. Record it here so a
      future review does not re-raise it as a missing behaviour.
- [x] Port `invalidateAfterMutation` — **already present** at the facade; nothing to do.
- [x] Wrap in a transaction — **not needed**; one write per mutation.
- [x] Caller evidence re-run: the frontend calls only `GET /branches` (`hooks/api/branches.ts:21`) and the
      org-hierarchy PATCH; no cron, worker, seed or script touches the mutations; the three dead service
      methods had exactly one consumer each, the controller. Routes and methods deleted.
- [x] `branches.service.ts` deleted outright. With its three write methods gone it was a pure
      pass-through to `BranchesReadService`, which the controller now injects directly — the deletion
      test answering "the complexity does not reappear anywhere".
- [x] Its now-unused write DTOs went too (`dto/branches.schemas.ts`, plus `orgUnitRowSchema` and a local
      `successSchema` that duplicated `common/openapi/response-envelopes`).
- [x] Spec cases deleted: the `BranchesService` describe block covered only the dead `update`. The live
      path keeps its own `org-hierarchy-branches-tenant-isolation.spec.ts`, so no coverage was lost.
- [x] `cache-invalidation-matrix.ts` now names one writer per namespace.

### Separate finding — ghost permission keys: **RESOLVED, it was a search miss**
- [x] `branch:create`, `branch:update` and `branch:delete` **do** exist in the backend catalog, at
      `backend/src/modules/rbac/permissions/shared.ts:407,413,419`. The lane looked for a `branch.ts`
      file and concluded absence from a filename; these keys live in `shared.ts` because they predate
      the per-module split. Not ghost keys, `useCan` works, no catalog action needed.
- [x] Consequence, decided: the three keys are now referenced by nothing, because the live routes gate on
      `settings:organization:manage` like every other hierarchy entity. **They are KEPT deliberately.**
      `role_permission_grants` carries an FK to `permissions.name`, so removing a key an organisation may
      already hold is a data migration, not a code deletion — and `backend/CLAUDE.md` §5 is explicit that
      key strings never change, because a rename breaks every stored grant. `check:permission-keys`
      passes 704/704 in both directions with them present.

### C3 deepened 2026-09-10 — the read seam, and the least-privilege trap in the card

The mutation half closed above. This closes the read half, and **the card's instruction — "point the two
dropdown reads at the hierarchy read" — could not be followed literally, because it is a privilege
regression.** `branch:view` sits in `EMPLOYEE_SELF_SERVICE` (`permissions/role-defaults.ts:18`) and is
merged at scope `all` *before any role is read* (`access-policy.ts:104-112,160`), so **every active member
holds it**; `GET /org-hierarchy/branches` requires `settings:view`, which is administration. Repointing the
two HR forms at it would have emptied the branch dropdown for every non-admin — and because both forms
destructure only `data`, never `isLoading`/`error`, the denial renders as "No branches found" rather than
an error. `[V]`

**Built instead — a read-only adapter on the canonical owner, not a weakened administrative route.**

- [x] `GET /org-hierarchy/branches/options`, `@RequirePermission("branch:view")`, on `OrgHierarchyController`.
      Query schema is *derived*: `listQuerySchema.omit({ status: true })`, so a holder of `branch:view`
      cannot widen the list to archived rows; `OrgHierarchyBranchesService.listOrgBranchOptions` pins
      `status: "ACTIVE"`. The administrative list keeps `settings:view` untouched.
- [x] **No parallel contract.** The route reuses `branchListResponseSchema`; the client reuses
      `orgBranchListContract`. The canonical row is strictly *narrower* than what `/branches` already
      served under the same key (which added `branchManager`/`branchHr` user objects, address, phone,
      email, pincode) — so this is a narrowing, not a widening.
- [x] Caller sweep re-run repo-wide (frontend, backend, jobs, scripts, tests, generated clients, runtime
      string construction): exactly **two** production callers, both HR dropdowns. `GET /branches/:branchId`
      and `branchDetailSchema` had **zero** callers of any kind.
- [x] Both migrated: `use-announcement-form.ts` and `create-job-form/job-basics-sections.tsx` →
      `useBranchOptions` (`hooks/api/org-hierarchy-branch-options.ts`), key
      `hierarchy.branchOptions()` — under the `hierarchy.all` prefix every branch mutation already
      invalidates, so cache invalidation needed no new writer.
- [x] Legacy deleted: `modules/branches/` entirely (controller, read service, module, DTO, 2 specs) +
      `app.module.ts` registration; frontend `hooks/api/branches.ts`, `branches-schema.ts`, the `Branch`
      interface, the barrel line, the `branches` query-key factory. knip: **files=0 exports=0**.
- [x] Regenerated `openapi.json` (both copies, byte-identical) and `api-contract-registry.json`. The
      OpenAPI delta is exactly `-/branches`, `-/branches/{branchId}`, `+/org-hierarchy/branches/options`
      (`permissioned`, `branch:view`, limit capped 100) with **zero** exposure changes elsewhere. The
      registry's retained `/branches` rows are the **sunset ledger** and were deliberately left.
- [x] `branch:view` is now referenced by the options route, so it stops being an orphan key. The three
      ghost write keys stay KEPT for the FK reason recorded above.

**Two orphans the sweep found that the card did not name.** `[V]`
- [x] Deleting `BranchesReadService` orphaned the `branches:list` cache namespace — three
      `invalidateForOrg` calls with zero readers. Removed, matrix entry removed, spec counts corrected
      (its header was *already* stale at 108/35 against an asserted 107/36), orphaned prefix-map entry
      removed. `check:cache-invalidation`: **1 → 0** documentation gaps.
- [x] The `headMember` entry in `check-relation-key-reach.mjs` named the deleted file, and that gate
      **fails on a stale baseline entry**, so it had to go in the same change.

**Tests that bite.**
- [x] `org-hierarchy-permission-fence.e2e-spec.ts` (**103 passed**): the new route added to the 401/403/
      happy matrix, plus six that pin the trap — `branch:view` without any settings authority gets 200;
      `settings:organization:manage` *without* `branch:view` gets 403; `branch:view` may **not** reach the
      administrative list; a `status` query is rejected 400 rather than widening; `limit=500` clamps to 100.
- [x] `org-hierarchy-branches-tenant-isolation.spec.ts` (**10 passed**): the ACTIVE pin proved on
      *rendered* SQL via `PgDialect`, with a **negative control** showing the administrative list emits no
      status predicate — so the pin cannot pass vacuously. Tenant scope and soft-delete exclusion re-asserted.
- [x] `hooks/api/branch-options-seam.test.tsx` (**18 passed**): reverting either form to `useBranches`
      fails; the hook gates on `branch:view` and never asks for `settings:*`; a denied gate sends zero
      requests; signal + contract + no `status` param; and the contract rejects the retired bare-array
      shape, the legacy `INACTIVE` status vocabulary, a missing `pageInfo`, and any row that lost a field
      the job form autofills from.

**Verification** — backend `tsc` **0**, frontend `tsc` **0**, `madge` **zero cycles**, knip **0/0**,
`check:permission-binding` **2428 bindings all matching**, `openapi:check` **current**,
`check:contract-vendor` **byte-identical**, `check:permission-catalog` **630 route-bound keys catalogued**,
plus route-classification · permission-keys · route-duplicates · contract-registry · authz-deny ·
cache-invalidation. Lint **not run** — not requested.

**Two accepted behaviour changes, stated rather than smuggled.** The dropdowns now offer only ACTIVE
branches (frontend §10: "parent selectors never offer archived/disabled/retired units"; the announcement
form previously offered archived ones, since the legacy read mapped ARCHIVED → `INACTIVE` and did not
filter). And the options read is capped at the platform's 100/page instead of the legacy flat 200; an org
with >100 branches sees the first 100. The route accepts `search`/`cursor` when a form needs to page.

**Pre-existing red, NOT from this work** (other sessions held uncommitted edits in the same tree):
`check:relation-keys` fails on `modules/build/core/projects-tickets-read.query.ts:54,56` — a `columns: {}`
site byte-identical to HEAD and unmodified by anyone; `check:response-contracts` on `hooks/api/delegations.ts`
and the untracked `lib/prefetch/settings-admin.ts`; `check:test-typecheck` on two settings/access specs.
None is in this change set.

---

## C4 — Wire Support automations to its module-owned adapter · **DONE (wave 1 + follow-up)**

- [x] Seven Support-scoped hooks in `frontend/hooks/api/support-automations.ts`: list · runs · create ·
      update · toggle · delete · test — all verified against the module controller's routes
- [x] `support/settings/automations/page.tsx` repointed
- [x] Audit trail confirmed by reading `support-automations.controller.ts`: create `:82`, update `:96`
      and delete `:106` each call `this.audit.record(...)`. `test` deliberately does not — firing a rule
      is an operation, not a policy write.
- [x] Accounting stays on the global route and the census says so
- [x] `settings-surface-census.spec.ts` updated — Support's rows still read `PENDING-MOVE`, correctly:
      HR/CRM/Accounting continue to share the global route, so the *route* has not moved even though
      Support now has its own adapter. The `why` strings record it.
- [x] `reports/19b-automations-rung-decision.md` — **the reference is deleted, not the file created.**
      No such file exists in either repo, and neither does `reports/07b-declaration-drift.md`, cited the
      same way by `check-declaration-column-drift.ts`. Both were a prior session's uncommitted working
      notes. Fabricating them would have invented evidence; both comments now state their substance
      inline and say the file never existed, so the next reader does not go hunting.
- [x] **Orchestrator correction 1:** the lane created a 193-line near-duplicate builder sheet and called
      the copy unavoidable because the shared component was "not in scope for this lane" — a lane
      artifact, not a constraint. The follow-up found the two differed by **exactly three lines** (which
      mutation hooks they call), injected those as props, and deleted the copy.
- [x] **Orchestrator correction 2:** the lane also duplicated the whole automation action/condition
      schema into `support-automations-schema.ts`. That copy is now three imports plus the one thing
      that genuinely differs — the support endpoint's offset pagination shape.
- [x] **What the duplication exposed, and this is the real find:** the lane's copy had
      `email.to: union([string, array(string)])`, matching the backend. The *global*
      `automations-schema.ts` had `to: z.string()`. So an automation with multiple recipients failed
      contract parse on the global route and rendered as an empty state, silently. Fixed at the source,
      and `AutomationAction`/`Rule`/`Run` are now `z.infer` of the schema instead of hand-written
      parallel types, so the drift cannot recur.

---

## C5 — Make an unspent DataScope unrepresentable · **DO NOT BUILD — the card's design is unsafe** `[V]`

The card asked for a branded `ScopedPredicate` proven to **(a)** not be comparable to `"none"` and
**(b)** not be stringifiable. Both prohibitions target operations that are legitimate and load-bearing
here, so the type as specified would either need escape hatches for both — defeating its purpose — or
break correct code. Measured 2026-09-10:

| The card forbids | Reality | Count |
|---|---|---|
| comparing a scope to `"none"` | That **is** the deny gate. `authorize.ts:30`, `accounting-ledger.service.ts:118`, `access-snapshot.resolver.ts:81`, `object-access.ts:49` … | **75** sites outside `apply-scope.ts` |
| stringifying a scope | Required by `backend/CLAUDE.md` §6: *"The cache key must include every filter that changes the result."* A DataScope is exactly such a filter. `buildScopedDashboardCacheKey(…, scope: DataScope, …)` interpolates it (`dashboard-cache-key.ts:19`), and `contacts.service.ts:44` carries the comment *"caching a scoped result under an unscoped one serves one caller's rows to the next"* | 4+ deliberate sites, each a cross-tenant control |

The scanner's own docblock already draws the right distinction — *"A cache key is not a predicate
either — it makes the cache finer than its data and hides nothing"* — i.e. stringifying into a key is a
**separate, correct** use, not a substitute for applying the predicate.

And the invariant the scanner actually enforces — *a resolved scope reaches a predicate* — is **not
expressible in TypeScript**. Forgetting to read a value is not a type error; catching that needs linear
or affine types, which the language does not have. A brand can stop a scope being *misused*; it cannot
stop one being *unused*, which is the entire defect class.

- [x] Design attempted and **rejected on evidence**, not on effort. Both prohibitions are wrong.
- [x] `check-scope-application.mjs` (328 lines, self-tested) **stays**. It is the correct tool for an
      invariant the type system cannot carry, not a stopgap for a brand that never arrives.
- [x] Real scale re-measured for the record: **84** `applyScope(` call sites across **52** files and
      15 `rbacScope` reads — not the "132 call sites, 30 resolvers" the card cited.
- [x] **The tractable half is DONE 2026-09-10.** `ScopePredicate` now sits beside `DataScope` in
      `common/rbac/data-scope.ts` (the leaf, not beside the runtime code) and is re-exported from
      `access.types.ts`. `DataScope` stays a plain union, so the 75 `"none"` comparisons and the cache-key
      interpolation are untouched. Applied to the seven signatures that actually **spend** a scope:
      `applyScope` · `ObjectAccess.predicate` · `applyClientAccountsScope` · `clientPartyViewScope` ·
      `contactPartyViewScope` · `ticketScopePredicate` · `AutonomyReviewService.scopePredicate`.
      Deliberately NOT applied to `clientPartyScope`/`contactPartyScope` (tenant join conditions) or
      `clientIdIs`/`contactIdIs` (plain filters) — they return `SQL` without spending a `DataScope`, and
      that distinction is the whole value of the name. The scanner is untouched and still the enforcement.

---

## C6 — One answer to "which module owns this permission key" · **DONE (wave 2)**

`[V]` `administeringModuleOf` (`common/rbac/module-vocabulary.ts:36`) is canonical, and
`backend/CLAUDE.md` §5 says so. Four private naive `split(":")[0]` copies existed:

### The backend item was WRONG as written — do not "fix" it the way the card said `[V]`

- [x] `access-policy.ts:81`'s `moduleOf` must **NOT** become `administeringModuleOf`. All five consumers
      ask *"which module's ENTITLEMENT gates this key"* — `isPlanGatedModule(permModule)`,
      `isModuleEnabled(orgId, permModule)`, `denied.has(...)`, `ctx.moduleAvailable(...)`,
      `CATALOG_MODULES`. `administeringModuleOf` answers a different question: which module's **admin
      ladder** owns the key. Home administers `chat:*`, but `chat` is what must be enabled. Substituting
      would have made a `chat:*` key consult Home's entitlement and, worse, made a per-user deny on
      `chat` stop stripping `chat:*` keys — a security regression dressed as a cleanup.
- [x] So the **duplicated implementation** was removed without touching the semantics: `namespaceOf`
      now lives in `common/rbac/module-vocabulary.ts` beside `administeringModuleOf`, which calls it.
      The private copy is deleted and all five sites import the shared one. The name change is the
      point — `moduleOf` read like "the module that owns this", which is exactly the confusion that put
      this item in the review.
- [x] Two pass-through hops deleted on the way: `access.service.ts` imported `moduleOf` **only** to
      re-export it, and `authorize.ts` imported it through that hop rather than from its owner.
- [x] **Found while doing it:** `access-pure-functions.spec.ts` and `access.service-utils.spec.ts` were
      **byte-identical**, 223 lines each — the same 40 tests running twice. Kept the one whose name says
      what it tests; the survivor now imports from `access-policy` directly instead of the barrel.
- [x] `permission.guard.spec.ts` was still building its request with only `user`. `PermissionGuard`
      reads `req.authContext` since C1, so four tests threw `UnauthorizedException` instead of asserting
      the permission outcome. The AuthContext spec lane missed this file; its mock now carries an
      `authContext` whose lookup consults the same `getModuleState` the tests already drive.
- [x] All three frontend copies verified as genuinely the same naive split, then deleted and repointed:
      `permission-matrix-types.ts:77` · `simulate-page.tsx:48-51` (same logic via `indexOf`) ·
      `permission-scope-selector.tsx:35-37`
- [x] NEW `frontend/lib/rbac/administering-module.ts` — **no second data table was created.** The lane
      found `administersNamespaces` already present on `MANIFEST.modules` (the vendored mirror of the
      backend `MODULE_REGISTRY`), carrying `["chat","mail","calendar","notifications"]` for `home` and
      `["party"]` for `crm`. It builds its namespace→module map from that, so it tracks the backend
      registry through the existing manifest sync rather than a hand-copied algorithm.
- [x] `MODULE_LABELS` gained `home: "Home"` and dropped the now-unreachable `chat` entry;
      `GROUP_LABELS` gained `home: "Home"`
- [x] Test added and it bites: `administeringModuleOf("chat:org-settings:manage")` must equal `"home"`;
      the naive split returns `"chat"` and fails all four Home-namespace assertions plus `party → crm`
- [x] Fourth naive split at `sidebar-nav-items.test.ts:236` — **keep.** It is fixture construction
      ("does this nav group's key belong to a gating module"), not a re-implementation of the grouping
      rule, and nav groups carrying Home-administered keys already lead with `home`.
- [x] **Orchestrator correction:** the lane left `export { administeringModuleOf as moduleOf }` in
      `permission-matrix-types.ts` for "any external consumers". A repo-wide search found **zero**
      importers — a dead pass-through of the kind §1.12 and §9 forbid. Deleted.

---

## C7 — One answer to "is this module enabled" on the frontend · **DONE (wave 2)**

- [x] Both pipelines confirmed to read the same `useAccess().data`. The divergence was the **loading**
      path: `useModuleEnabled` returns `true` while `data` is undefined, but `useEnabledModules()`
      returns `[]`, so `matchesOrgModule([], key)` was `false` and `<RequireModule>` rendered
      `<ModuleDisabledState>` during the very request the hook gate called enabled.
- [x] **A real bug fell out of this, not just an inconsistency:** `ORG_MODULE_NAME` excludes modules
      with `productKey: null`, so `useEnabledModules()` never emitted `"CHAT"` and
      `<RequireModule module="chat">` was **permanently** showing disabled even with
      `data.modules.chat === true`.
- [x] `<RequireModule>` repointed at `useModuleEnabled`, with `useAccess()` for the loading guard so it
      renders `null` rather than flashing the disabled state
- [x] `matchesOrgModule` and `ORG_MODULE_NAME` **kept** — six out-of-lane consumers still need the
      uppercase wire format (sidebar products, quick-create, dashboard access, command centre, both
      automations settings). The lane refused to delete them and said so instead of guessing.
- [x] Test added asserting route gate and hook gate agree for `build`/`projects` and
      `accounting`/`finance`, plus the loading case that would fail on revert
- [x] `MODULE_TO_PRODUCT` and `EXTRA_MODULES` deleted; label and productKey now derive from
      `moduleById(key)`. All 11 covered keys verified to carry a `displayName` first.
- [x] **Orchestrator correction 1:** deleting `EXTRA_MODULES` silently dropped Chat's icon in
      `/settings/modules` to a generic globe. The manifest is JSON and cannot carry a React component,
      so `ICON_WITHOUT_PRODUCT` restores just the icon — three lines, versus the deleted map's
      label + description + icon + accent.
- [x] **Orchestrator correction 2:** the lane's own risk note ("the gate should confirm `tsc` passes")
      was well placed — it did **not** pass. `MODULE_ACCENTS[productKey]` indexes a
      `Record<ProductKey, …>` with a manifest `string` (TS7053, twice). Fixed by narrowing through
      `definition.key`, which is already a `ProductKey` — no cast.

---

## Program-wide rule — named handlers inside the component

Stated by the owner 2026-09-10, now written into `frontend/CLAUDE.md` §Props & attributes.

**Every handler is declared INSIDE the component or page that uses it, as a named function, and
referenced by name from JSX.** No inline anonymous function in any function-typed JSX prop —
`onClick`, `onChange`, `onSelect`, `onOpenChange`, `render`/`cell` callbacks, or a closure built
inside a `map`. Where a closure needs a loop variable, extract a child component that declares its
own named handler.

- [x] Written into `frontend/CLAUDE.md`
- [x] C8 audited — 0 conversions needed; its 11 files are server components with no function props
- [x] C4 follow-up lane swept its files (3 conversions in `automation-builder-sheet.tsx`)
- [x] Every later wave's frontend lane carried the rule in its brief (C6, C7, C10, C2)
- [x] **GATE PASSED:** all 30 `.tsx` files this program touched swept — **0** inline JSX closures remain.
      One file needed real work: `components/automations/ai-node-config-forms.tsx` held 24. Converted to
      named handlers declared inside each component, and the `fields.map(...)` row — which needs the loop
      index — became its own `AiExtractFieldRow` component with its own named handlers, per the rule's
      "extract a child component" clause. That also removed an `as AiExtractField["type"]` forced cast
      (§6) in favour of a real type guard.

## C8 — Cut the call count on the settings surface · **DONE (wave 1)**

- [x] `refetchOnWindowFocus` and `refetchOnReconnect` both `"always"` → `true`, so the 30s `staleTime`
      governs. The lane argued `refetchOnReconnect` deliberately rather than changing it silently:
      reconnect often follows sleep/handover, where a refetch is wanted, and `staleTime` still gates it.
- [x] True page count is **23**, not the second-hand 22/23 split I briefed
- [x] NEW `frontend/lib/prefetch/settings.ts` — 12 `prefetchX` helpers, `import "server-only"`,
      `createServerQueryClient()` + `dehydrate()`, contracts imported from their schema files
- [x] 11 pages given server prefetch; 12 skipped **with stated reasons**, not silently: `/settings`
      (session only) · `/settings/modules` (`"use client"`, no server component) · `users`, `webhooks`,
      `audit-log`, `delegations`, `billing` (initial state comes from URL params, so a server prefetch
      would hydrate the wrong key) · `billing/ai-credits` · `incoming-transfer`
      (`staleTime: 0` + `refetchOnMount: "always"` discards it) · `roles/simulate`, `roles/audit`
- [x] Query-key hash verified to match the client hook — a mismatched key means the prefetch is
      silently discarded and the round trip is paid anyway

Original premise, kept for the record: `hooks/api/access.ts:65-67` set `staleTime: 30_000` beside
`refetchOnWindowFocus: "always"`, and `"always"` skips the staleness check, so the whole access bundle
refetched on every tab focus — and that hook backs `useCan`, `useModuleEnabled`, `usePermissionGate`
and navigation. Every page's server component was confirmed to hold its permission check before
prefetching, and no page double-fetches after hydration.

---

## C9 — Membership write and cache bust as one call · **DONE (wave 3)**

- [x] The 13 single-user sites confirmed exactly as listed — **and four more the card missed**:
      `bustMembershipStatusCacheMany` at `employee-bulk-onboarding.service.ts:164`,
      `org-purge.service.ts:93`, `org-lifecycle.service.ts:71`, `cron-org-purge-worker.service.ts:125`.
      17 sites migrated, not 13.
- [x] Seam: NEW `common/org/membership-bust.ts`. Mechanism chosen deliberately against `backend/CLAUDE.md`
      §4's three options — **`registerAfterCommit` with an inline fallback**, because a Redis DEL/INCR is
      a network call and mechanism 1 would hold a Neon pooled connection across it at every membership
      write, while mechanism 2 (outbox) buys durability that the 15-second membership TTL already
      provides. `registerAfterCommit` returns `false` outside an ambient context (cron sweeps), and the
      fallback runs inline so the work is never dropped.
- [x] `bumpPermissionsVersion` transactions verified unchanged at every site that had one
- [x] `user-ops.service.ts` additionally collapsed a per-user `Promise.all(map(...))` into one batched
      call — §6's named anti-pattern, and the widest of these reads members at `.limit(10000)`

**Orchestrator corrections — one of them a security regression:**
- [x] **The lane deleted a deliberate double-bust on the revocation path.** `invalidateMemberSessionCaches`
      ran the invalidation **immediately AND** via `registerAfterCommit`; the lane read the first as
      redundant and removed it. It is not redundant: the immediate pass closes the window where a
      concurrent request re-populates the cache with pre-revocation data while the revoking transaction
      is still open, and the after-commit pass clears whatever landed during it. Losing either half
      leaves a revoked member reading as active for up to the 15s TTL.
      `membership-revocation.spec.ts` names the invariant in its own describe block
      ("access caches are busted immediately and post-commit") and caught it. Restored **through** the
      seam as `bustMembershipNowAndAfterCommit`, so the revocation semantics are expressed by the module
      rather than by a call site opting out of it. The lane's version had also silently dropped the
      after-commit pass over the `userSession` key.
- [x] The seam passed `orgId` positionally even when the caller omitted it, turning two-argument calls
      into three-argument ones with a trailing `undefined` and failing the GDPR erasure assertion. The
      call shape is now preserved exactly, and the seam's own spec asserts that rather than the old shape.
- [x] `user-ops-bulk-update.spec.ts`'s cache double lacked `invalidateMany`/`invalidateNamespaceMany`, so
      the batched path threw `TypeError` inside the service. The batching is correct and was kept; the
      double was completed.
- [x] The coupling test bites: removing `registerAfterCommit(work)` makes the bust run immediately and
      fails `not.toHaveBeenCalled()`; removing the bust entirely fails the post-drain assertion.


### C9 deepened 2026-09-10 — a bust seam is not a mutation owner

The wave-3 seam made the bust callable in one line; it did not make it **unforgettable**. Every caller
still held the whole protocol — write the row, sync the structural role, bump the permission version,
schedule the bust — and a new writer that skipped the last step compiled, passed every gate and left a
revoked member reading as active for the 15-second TTL. Measured at backend HEAD `7d5c126df`: **19 direct
`organization_members` writes across 12 production files, and 14 files importing a bust primitive.**

- [x] NEW `common/org/membership-mutations.ts` (289 lines) — ten intention-revealing operations
      (`createMembership`, `createMemberships`, `createOwnerMembership`, `allocateMembershipId`,
      `changeRole`, `changeRoles`, `setLifecycleStatus`, `transferOrgOwnership`, `deleteMembership`,
      `deleteMembershipsById`). Each owns the row write **and** the effects that write earns, so the
      public interface is strictly smaller than the protocol it replaced.
- [x] `withMembershipMutations(cache, run)` wraps the caller's OWN transaction call and drains the
      recorded invalidation once, after it resolves. This is the mechanism choice that matters: putting
      the bust inside the transaction callback would run it inline outside an ambient request context
      (`runInTenantTransaction` builds a context with no `afterCommit` array), i.e. against a transaction
      that may still roll back. Draining after the call preserves the exact point every caller busted from
      before, and a rejected transaction drains nothing.
- [x] `membership-bust.ts` keeps `scheduleMembershipBust`, `scheduleMembershipBustMany` and
      `bustMembershipNowAndAfterCommit` as PRIVATE primitives and now exports four named operations
      instead: `revokeMembershipAccessCaches`, `bustMembershipsAfterOrgTeardown`,
      `bustMembershipAfterIdentityErasure`, `bustMembershipAfterOwnershipChange` — one per case where the
      membership rows are written by a cascade, or outlive an erased identity.
- [x] Revocation's deliberate immediate-plus-after-commit double, including the `userSession` key, is
      preserved and now expressed by `revokeMembershipAccessCaches`;
      `OrgMembershipAccessRevocation.invalidateMemberSessionCaches` delegates to it.
- [x] Batching preserved and widened: the drain issues one `bustMembershipStatusCacheMany` for any
      number of users, so bulk create / bulk role change / whole-org teardown are two Redis commands
      regardless of member count. Proved at 250, 120 and 5,000 members.
- [x] `bumpPermissionsVersion` behaviour unchanged at every site: folded into `setLifecycleStatus` and
      `deleteMembership` (which is where the callers had it), reached through `syncStructuralRoleAssignment`
      on the create/role paths, and left in the domain everywhere the domain owned an extra bump.
- [x] The bespoke `assignStructuralRoles` in `bulk-onboarding-writes.ts` — a second implementation of
      `syncStructuralRoleAssignments` — is deleted; `createMemberships` groups by role and calls the
      canonical one. `employee-bulk-onboarding-query-count.spec.ts` still passes at its pinned count.
- [x] Three duplicated copies of the `nextval(pg_get_serial_sequence('organization_members','id'))`
      bootstrap allocation collapse into `allocateMembershipId`.

**Gate:** NEW `check:membership-writes` (+ `:self-test`, `:list`), wired in `ci.yml`'s hermetic `gates`
job. It rejects a Drizzle write, raw DML, a private-primitive import, or a hand-built `MembershipMutations`
anywhere outside the owner, with six per-file write exemptions and three primitive exemptions, each
carrying a reason. `check:gate-wiring` now reports **107 gates, all invoked by a reachable job**.

**After:** direct writes outside the owner **19 → 0**; primitive import sites **14 → 0**.

**Verification:** scoped `tsc --noEmit` over the 21 migrated files and their transitive graph **0 errors**;
spec-scoped typecheck over the 10 affected specs **0 errors**; `madge --circular` **zero cycles** (6,480
files); suites `common/org` 42, `organization` 515, `users` 66, `ownership` 57, `gdpr` 243,
`hr/directory` (migrated specs) 27 — **all passing**; `check:membership-writes` **OK**;
`namespace-coverage`, `cache-invalidation`, `cache-key-shapes`, `permission-keys`, `vacuous-assertions`,
`fire-and-forget`, `module-di`, `transaction-callbacks`, `kebab-case`, `import-direction` **all PASS**.

**The tests bite — proved by mutation, not by assertion count.** Five defects planted in the owner, each
caught by `membership-mutations.spec.ts`: dropping the invalidation record (4 failures), dropping the row
write (2), dropping the version bump (1), draining on a rejected transaction (1), and fanning the bulk
drain out per user (3). Zero silent mutants.

**One correction to a lane.** The users/ownership lane added `jest.mock(".../membership-bust")` to
`user-ops-bulk-update.spec.ts` and `users-seat-limit.spec.ts`. Both specs pass without it — the mock was
masking nothing and would have removed real invalidation coverage from two specs that exercise it. Removed.

**Pre-existing red, NOT from this work** (other sessions hold uncommitted edits in the same tree):
`hr-export-jobs.service.ts`, `leads/*`, `contacts/*` typecheck errors and 9 spec-typecheck errors all trace
to an in-flight `AuthContextLookups` widening; `jwt-guard-revocation.spec.ts` fails on a stale `JwtAuthGuard`
double; `org-hierarchy.controller.ts` grew 498 → 512 lines; `check:over-300` was already 392 against a
baseline of 390 **at HEAD** — this work moves it by exactly 0 (no touched file crossed 300 in either
direction). The one file-size row that WAS ours — `invitation-acceptance.service.ts`, 508 → 490 — has been
removed from the exceptions ledger.

---

## C10 — Settings section shape: schemas out, one form module, missing tests · **DONE (wave 2)**

**Schemas out of `.tsx` (root `CLAUDE.md` §6) — all six extracted:**
- [x] `org-branding-schema.ts` · `org-holiday-calendar-schema.ts` · `org-localization-schema.ts` ·
      `create-org-token-schema.ts` · `create-user-token-schema.ts` ·
      `hierarchy/cost-center-form-schema.ts` (matched the convention of its five existing siblings)

**File size (§7):**
- [x] `org-localization-section.tsx` 339 → **164** (schema, constants and the edit form left)
- [x] `org-branding-section.tsx` 383 → **313**. Still 13 over the 300 *target*, well under the 500 hard
      limit, and the lane justified stopping: what remains is five `FormField` render callbacks, the
      upload previews and four watched values — one form's shared state, with no cohesive sub-unit left.
- [x] `cost-centers-page.tsx` → 481 (under the hard limit) after `CostCenterActionsCell` was extracted

**Shared behaviour — measured, then deliberately NOT built:**
- [x] The brief's numbers were wrong and the lane corrected them: **10** sections not 8; the edit-toggle
      trio appears in **6**, not "64 occurrences"; `useUpdateOrgSettings` is shared by exactly 4;
      `org-business-hours-section.tsx` uses `useState` over an array and has no Zod schema at all.
- [x] **Verdict: do not build `useSettingsSectionForm`.** Deletion test fails — the complexity would
      *move* to 4 files, not vanish, and the wrapper would need a `getPayload` callback typed per
      section, making its interface as complex as its body. A 4-site, 3-5 line duplication is below the
      threshold. `hooks/api/organization.ts` was left untouched.

**Tests — was only `org-security-schema.test.ts`:**
- [x] Added: `org-branding` · `org-holiday-calendar` · `org-localization` · `org-profile`
- [x] `org-business-hours`, `org-config`, `org-danger-zone`, `org-incoming-transfer` have **no schema
      to test** — the lane named the reason for each (no form / presentation-only / confirmation flow)
      rather than writing a vacuous test that passes regardless

**Orchestrator corrections:**
- [x] The lane called `defaultExpiry` duplicated across the two token schema files "intentional — each
      schema owns its own default-value contract". It is **byte-identical** and nothing in it is
      schema-specific. Moved to `lib/date-utils.ts` as `datetimeLocalAfterDays`; both sheets repointed.
      A third variant in `quote-create-sheet.tsx` is genuinely different (calendar date, not
      datetime-local) and was left — see the appendix for its latent UTC bug.
- [x] `hierarchy-lifecycle-invariants.test.ts` broke on the `CostCenterActionsCell` extraction: it greps
      the page for markup that legitimately moved. Rather than weaken it, `lifecycleSurface` now follows
      **every** sibling component the page imports (not just `*-columns`), the gate *resolution* is still
      asserted on the page, and the guarded markup on the widened surface. The extraction itself was
      verified byte-for-byte identical, with the `makeXHandler(c)` closure factories replaced by real
      named handlers inside the child — exactly what the program-wide rule asks for.

### C10 residuals closed 2026-09-10 — and the wave-2 deferral was REVERSED

The wave-2 verdict above ("do not build `useSettingsSectionForm`") is left standing as the record of what
was measured then. The owner re-scoped it in
`claude-prompts/architecture-review-pending/07-c10-settings-form-module-and-residuals.md`, which requires
the shared owner **and names the exact failure mode the wave-2 lane predicted** — "must delete meaningful
protocol code rather than relocate it into `getPayload`, `onEverything`, or cast-heavy configuration".
Built to that constraint as `features/settings/organization/use-organization-settings-form.ts`.

**Where wave 2's measurement was wrong, and where it was right.**
- Wrong on reach: it counted the 4 sections sharing `useUpdateOrgSettings`. The edit/cancel/save protocol
  actually appears in **6** — the 4, plus `org-security-section.tsx` (a different mutation,
  `useUpdateOrgSecurity`) and `org-config-section.tsx`, whose copy was **hoisted into the page** as 5
  `useState`s, 6 handlers and 14 props, so a file-local scan could not see it.
- Wrong on "3-5 line duplication": each copy is ~25 lines once the mutate/toast/exit/error block is
  counted, and `org-business-hours-section.tsx` held a seventh `useState` variant with no schema at all.
- **Right about `getPayload`.** That interface was not built. Payload conversion stays inline in each
  section's own `handleSave`, which calls `save(payload)`. The hook takes 4 inputs
  (`resolver`, `serverValues`, `mutation`, `successMessage`) and returns 6 members.

**Deletion test, measured on production files only (`git diff HEAD --numstat`, tests excluded):**
+652 / −605 = **net +47**. Decomposed: `org-business-hours-schema.ts` (+66) and `org-config-schema.ts`
(+28) are **new validation capability**, not the shared owner — business hours had no Zod schema and
saved `""` from a cleared time input; config had none either. Excluding those two, the consolidation
itself is **net −47** production lines, against a +94-line hook. The deletion test passes for the
abstraction and the +94 is capability, not overhead.

**Two latent defects the consolidation surfaced:**
- `org-profile-section.tsx` and `org-branding-section.tsx` called bare `form.reset()` on Cancel, which
  restores *mount-time* defaults. After one successful save, Cancel put back stale pre-save values.
- No section re-seeded when the org record changed underneath. Now `values` + `resetOptions:
  { keepDirtyValues: true }`, **bite-proved**: flipping `keepDirtyValues` to `false` fails the mid-edit
  test with `Expected "My unsaved edit", Received "Someone else's rename"`.

**Residuals:**
- [x] `org-branding-section.tsx` 313 → **251** (under the 300 target) by extracting `BrandingSummary`
      into `org-branding-fields.tsx`; `org-localization-section.tsx` 164 → **138**
- [x] `organization-settings-page.tsx` 165 → **80** — the hoisted config state machine is gone
- [x] Schema tests added: `create-org-token-schema` (26) · `create-user-token-schema` (20) ·
      `cost-center-form-schema` (27) · `org-business-hours-schema` (11), plus 10 for the shared owner.
      The token tests pin the scope difference in both directions — a ~180-day expiry is rejected by the
      org schema (90-day CRM ceiling) and accepted by the user schema (1-year ceiling), same input value
- [x] Settings `.tsx` inline schemas: **1**, `uploadKeyContract` in `settings-profile.tsx`, an
      endpoint-only response contract. Classified in a one-line comment and allowlisted by
      `features/settings/__tests__/settings-schema-placement.contract.test.ts`, which excludes test
      fixtures, throws on an unreadable directory and fails on a stale allowlist entry
- [x] Exemptions are executable, not prose: `org-settings-form-adoption.contract.test.ts` holds the four
      non-migrated sections with a reason each (holiday calendar = collection CRUD · data & privacy =
      presentation-only · incoming transfer and danger zone = ConfirmDialog surfaces) and fails if a new
      section skips the owner or an exemption goes stale

**Gate results 2026-09-10.** `tsc --noEmit` **0 errors** · `jest features/settings` **23 suites /
221 tests, 0 failed** · `check-named-handlers` **PASS** (0 non-trivial inline closures in release scope) ·
`check-file-sizes` **PASS** (5,323 judged) · `madge --circular` **zero cycles** over 5,988 files · zero
casts / `any` / `@ts-ignore` in the changed files. **Lint not run, full suite not run, `next build` not
run — none were requested. Rendered behaviour was NOT inspected in a browser.**

**Two gates are red and neither is from this work**, proved by comparing HEAD blobs to the worktree for
every changed file: `check:over-300` is 515 against baseline 513 because a **concurrent session** (C8,
`05-c8-prefetch-all-settings-surfaces.md`) added three >300-line test files under `lib/prefetch/`
(348 / 389 / 494); this work is the only thing that *removed* a file from that list. 515 − 3 + 1 = 513,
the baseline exactly. `check:type-assertions` fails on a stale ledger entry for
`components/automations/ai-node-config-forms.tsx`, a file nothing in this tree has modified.
**The baseline was not moved and neither foreign file was touched.**

---

## C11 — Delete the auth forwarding facade · **DONE (wave 1)**

- [x] All nine methods verified as bare delegations before deletion — premise confirmed, not assumed
- [x] `googleOAuth` moved to `AuthService`, which already owned `register`/`logout`/`getSessionData`
      and already had `db` + `audit`; it gained `AuthMembershipResolverService` and `AuthAnalyticsService`
- [x] Six consumers repointed: `auth.controller.ts`, `auth.service.ts`, and four specs
- [x] `auth-tokens.service.ts` deleted; removed from `auth.module.ts` providers and exports
- [x] `auth-membership-resolver-isolation.spec.ts` / `auth-passwordless-isolation.spec.ts` untouched —
      they test the underlying services directly. No spec deleted, no coverage lost.
- [x] Stale allowlist entry for `auth-tokens.service.ts` removed from `scripts/check-placement-bypass.mjs`
- [x] `agent-token-ceiling.ts` deleted, constant inlined
- [x] **Orchestrator correction:** the lane inlined `AGENT_TOKEN_DEFAULT_CEILING` into the service AND
      into its spec as two separate consts, so the spec asserted against its own copy and could never
      catch a change to production. Fixed: the service now exports it and the spec imports it.
- [x] GATE FOLLOW-UP CLEARED: `auth.service.spec.ts` did gain `{} as never` at constructor position 8,
      but `git diff` shows the file already stood on that pattern — all seven other constructor
      arguments were `as never` before this lane touched it, and the lane's own diff is a rename plus
      one more argument of the same shape. Pre-existing spec idiom, not a new forced type introduced
      here. Converting all eight to typed stubs would mean importing and faking eight service classes
      for a spec that exercises one method; left as-is deliberately.

---

## Found while running the gate — NOT caused by this program

Four suites were already red at this head, and one gate had a hole. Each was diagnosed rather than
silenced; two were fixed because the fix was mechanical and provably safe, two were not.

- [x] **FIXED — `keyset.spec.ts`.** Two build cursor builders bound their keyset tuple through a const
      rather than at the interpolation site, so the detector could not see it. Both were already safe;
      `sql.param` is now inline, which is what the gate exists to make visible. From `8040f5872` /
      `e2ec8e5c0`.
- [x] **FIXED — `injection-surfaces.spec.ts`.** `kb-candidate.service.ts` reached the `sql.raw` scan
      without a review entry. `SET LOCAL hnsw.ef_search` **cannot** take a bind parameter in Postgres, and
      the value is `kbAnnEfSearch(cap)` — a bounded integer from named constants with no caller input on
      the path. Added to the reviewed set with that reasoning. From `d8af2ae33`.
- [x] **FIXED, AND THE GATE ITSELF WAS HOLED — `bola-bulk-mixed-tenant.spec.ts`.** The ratchet fell 21 → 20
      because `ProjectsTicketsQueryService.bulkUpdate`'s count check moved to `readMutationTickets` in
      another file. The protection is intact and in fact stronger (count check + per-row DataScope +
      `FOR UPDATE`). **But the scan followed only same-class `this.x()` helpers, so a bulk query extracted
      into an exported function disappeared from it entirely — `classifyBulkMethod` saw no `inArray` and
      answered "not-bulk".** Any bulk endpoint, guarded or not, could be made invisible by that refactor.
      `classifyBulkMethod` now follows one hop into module-level functions when an id-shaped argument is
      passed, with a new self-test proving both the guarded and unguarded delegated cases. Both original
      thresholds hold unchanged (≥21 guarded, ≤45 unguarded) and the TRIAGED named set still matches
      exactly, so nothing was reclassified to make it pass.
- [x] **FIXED 2026-09-10 — and the review found a real cross-tenant write.** The card's attribution was
      wrong: `b20dca13b` added exactly 2 KB operations and removed none, and the tenant-selector count was
      **already 13 at its parent**. What was actually stale was `openapi.json` itself — `openapi:check`
      reported it STALE, still carrying `POST|PATCH|DELETE /branches`, the routes **C3 deleted**. So the
      "2 unresolved handlers" were `BranchesController_create` / `_update`: a stale contract, not a blind
      spot. Regenerated — 3,667 operations, 0 undeclared, and the app boots.
- [x] **The 13th selector was 3 false positives, and hid one true one.** `contacts` declares
      `organizationId` as a **number** (`dto/contact.schemas.ts:7,23,40`, `z.coerce.number()`) — the CRM
      company FK, not our string-UUID tenant. The census classified by NAME alone, and the selector buckets
      are **exempt from the object-reference sweep**, so those three reached rows unanalysed.
      `declaresNumericId` now rules them out by declared type and sends them back through the sweep. 13 → 10,
      actor selectors unchanged at 100 (the rule is a no-op there, which is the control).
- [x] **`POST /crm/ingress/inbound` was a genuine cross-tenant write.** `InboundIngressService.accept`
      checked only that the body's `organizationId` **existed** — never that it was the caller's. So any
      holder of `crm:ingress:submit` could write an `inbound_events` row and start a
      `crm.inbound-communication` workflow in **any other tenant**. The org now comes from the token
      (`@CurrentUser()`), a mismatch answers 404 per §4, and the three internal sweeps pass their own
      connection's org. Two deny tests added, one of which uses an org that **exists** — the point.
- [x] **The census is now pinned BY NAME** (`tenant-selector-surface.json`), like the actor surface.
      `toHaveLength(12)` said nothing about *which* surfaces were reviewed, so a swapped-in selector netted
      to zero and a wrong count could be "fixed" by editing the number. All 10 were read against §5:
      session-exchange is membership-checked at `auth.controller.ts:377-383`; cron and internal/audit are
      secret-gated; restore and the three operator-access routes are platform administration;
      `organization/switch` is named legitimate in §5; `public/referrals/register` is `@Public()` with the
      org as its only tenant selector.
- [x] **RESOLVED 2026-09-10 — the test was documenting a defect that `d6ad7c4bd` FIXED.** Read the guard:
      the tombstone is a **cache, not the sole authority**. Only a *positive* tombstone short-circuits; an
      absent one is a cache MISS that falls through to `user_sessions.is_revoked`, and both authorities
      failing denies (`jwt-auth.guard.ts:147-166`). So the newer behaviour is strictly safer and the
      assertion was inverted, not the code — exactly the "a spec documenting a gap reads as requiring it"
      trap. The test now asserts the DB flag alone DOES revoke, with a control proving the deny came from
      the flag and not from the miss. `backend/CLAUDE.md` §4 said the opposite and is corrected.
- [x] **FIXED — `ai-call-metrics.spec.ts` is deterministic.** `AiCallMetrics` reads the clock only through
      `Date.now()`, which Jest 29 modern fake timers fake, so the sleeps became
      `jest.advanceTimersByTimeAsync` and every tolerance window became an **exact equality** — stricter
      than the thresholds it replaced, and immune to machine load. Fake timers are scoped to the one
      describe block. Each of the four tests carries a named mutation that would fail it.

### The typecheck blind spot this exposed — now written into `backend/CLAUDE.md` §8
`tsconfig.json` includes only `src/**/*` and `evals/**/*`, but jest's `roots` add `test/security` and
`test/perf`. So **those trees run but are never typechecked.** When `JwtAuthGuard` went from 5 to 6
constructor arguments, `tsc` reported 34 errors across `src/**` and **zero** for the three constructions
under `test/security/appsec/` — one failed at runtime, and two passed only because the missing
dependency was never reached. Typecheck is the only gate that sees arity, and it does not see these.

## Appendix — findings that did not become cards

Recorded so they are not lost. None is approved work; each needs a decision.

- [x] `frontend/lib/auth-session.ts` — `fetchSessionDataWithCache(userId, _orgId)`. **Done in C2**: the
      parameter is dropped. It was never read, the backend endpoint takes no org argument, and React
      `cache()` resets per server request, so it was inert even as a key.
- [x] **FIXED** `quote-create-sheet.tsx:77` — `defaultExpiryDate` now calls `formatDateOnly(d)`, which
      builds the calendar date in local time. One line plus an import.
- [x] **DONE** `auth-passwordless.service.ts` split into `auth-email-verification.service.ts` (98) ·
      `auth-magic-link.service.ts` (180) · `auth-email-otp.service.ts` (141) · `auth-passwordless.utils.ts`
      (71, holding the genuinely shared `findOrCreateUser`/`generateToken`/`serializeEmailError`).
      **Orchestrator correction:** the lane kept `AuthPasswordlessService` as a 48-line coordinator
      forwarding all six methods — the exact facade C11 deleted. It existed only because my brief did not
      give the lane `auth.controller.ts`; a lane artifact, not a constraint. The controller now injects the
      three services and the coordinator is deleted.
- [x] **Found by the full suite, not by typecheck:** `notification-delivery-class.spec.ts` matches
      `/\b[A-Za-z]*EmailService\b/` to find direct email callers — deliberately loose, so it catches the
      module-owned wrappers (`AutomationEmailService`, `CrmOutboundEmailService`, `ClientsEmailService`).
      `AuthVerifyEmailService` collided with it and dragged `auth.controller.ts` into the inventory though
      it sends no mail. Renamed to `AuthEmailVerificationService` (a better name: it is the
      email-verification flow, not an email sender) rather than loosening a gate or filing a false entry.
- [x] **DONE** `route-access-extensions.ts` — the prose→machine gap is closed by making the claim a
      **structured field**. `backendRoute` names the operation; the test reads `x-permission` from the
      vendored `contracts/openapi.json` and fails on a mismatch. The brief's premise was wrong and the lane
      said so: **5** entries claim a specific backend gate, not ~24, and there are **23** entries, not 24.
      The other 18 justify a key choice and are already covered by the key-exists assertion.
- [x] **FIXED — the liveness gap, at the two callers that lack a guard, not in the resolver.**
      See [PRD-AUTH-CONTEXT.md](PRD-AUTH-CONTEXT.md) §5.

## Explicitly settled — do not re-raise

- `common/rbac/module-availability.ts:46-75` is already the deep module for backend availability.
- `frontend/lib/wizard-gate.ts` — one `resolveWizardGate`, four layouts, no duplication.
- `common/auth/jwt-auth.guard.ts` is dense but each branch cites the incident it prevents.
- The frontend `PERMISSIONS` array being a subset of the backend catalog is deliberate.
- `settings-deprecated-routes.controller.ts` aliases are retained to a documented 2027-03-31 sunset.
- `/chat/moderation` deleted and `/chat/settings` kept are settled product decisions.
- ADR-0001 and ADR-0002 are not contradicted by anything in this PRD.
