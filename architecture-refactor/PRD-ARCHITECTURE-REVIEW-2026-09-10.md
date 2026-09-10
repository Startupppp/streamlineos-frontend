# PRD — Architecture review 2026-09-10: org · login · access · RBAC · settings · module access · API cost

Status: **OPEN** · Baseline commit `db887baad` · Source: architecture review run 2026-09-09/10
Scope approved by the owner: **all eleven candidates**.

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

- **Wave 1 — RUNNING:** C4 · C3 · C8 · C11, alongside the tail of C1.
- **Wave 2 — after wave 1 gate:** C6 · C7 · C10.
- **Wave 3 — after wave 2 gate:** C2 · C9.
- **Wave 4 — own program:** C5.

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

## C1 — One request-auth context · **IN PROGRESS**

Full decision record and lane checklist: **[PRD-AUTH-CONTEXT.md](PRD-AUTH-CONTEXT.md)**. Do not
duplicate its todos here. Summary of what it closes: `module.guard.ts:46` and `authorize.ts:34`
resolved module availability twice per request through resolvers that diverged in degrade mode. `[V]`

- [ ] Complete every lane in `PRD-AUTH-CONTEXT.md`
- [ ] Run its gate section (typecheck · madge · touched specs)

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
- [ ] **Left open, reported not fixed:** backend `plan` is `string | null` while the frontend types it
      `Plan` (a 4-value union). `unwrapBackend` widens silently, so an unrecognised plan string would be
      accepted unchecked. Narrow the backend schema to the enum, or parse it on the frontend.

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
- [ ] Re-run the caller evidence, then delete the three routes and three service methods
- [ ] Delete the spec cases in `branches-tenant-isolation.spec.ts` that cover the deleted methods
- [ ] Update `cache-invalidation-matrix.ts:126-139` to one writer per namespace

### Separate finding — ghost permission keys: **RESOLVED, it was a search miss**
- [x] `branch:create`, `branch:update` and `branch:delete` **do** exist in the backend catalog, at
      `backend/src/modules/rbac/permissions/shared.ts:407,413,419`. The lane looked for a `branch.ts`
      file and concluded absence from a filename; these keys live in `shared.ts` because they predate
      the per-module split. Not ghost keys, `useCan` works, no catalog action needed.
- [ ] Consequence for the retirement, though: `branches.controller.ts` is the **only** file in the repo
      that references those three keys. Retiring the three routes orphans all three catalog entries.
      Decide then — delete the entries with the routes, or keep them if the live org-hierarchy branch
      mutations should be regated onto them instead of whatever they currently use.

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
- [ ] If this is ever reopened, the tractable half is narrower and worth stating: give `applyScope` a
      **named return type** so a predicate is greppable and self-documenting, while leaving `DataScope`
      a plain union so the deny gate and the cache keys keep working. That is a naming change, not a
      migration, and it does not retire the scanner.

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
- [ ] **NOT FIXED, needs its owner — the BOLA census in `bola-body-id-binding.spec.ts` /
      `bola-body-synthesis.spec.ts`.** `b20dca13b` regenerated `openapi.json` without re-reading the
      census the file itself says must be re-read after a regeneration. `counts.operations` was updated
      3666 → 3669 (descriptive), but **two assertions are real review items and were deliberately left
      red**: a **13th** tenant/actor selector now appears where 12 were reviewed, and **2** handlers no
      longer resolve — an unresolved handler is a blind spot by this file's own definition. Root
      `CLAUDE.md` §5 makes a client-sent `orgId` a cross-tenant hole unless it is one of the documented
      legitimate cases, so admitting a 13th into an allowlist is a security review, not a count bump.
- [ ] **NOT FIXED — `session-revocation-enforced.spec.ts` "DEFECT SHAPE".** Asserts that with Redis up and
      no tombstone, a DB `is_revoked` flag alone does **not** reject the token; the guard now rejects it.
      The contract changed under the test in `d6ad7c4bd` ("revocation took up to five seconds to bite").
      Deciding which behaviour is correct is a security call for that change's owner. (This spec ALSO had
      a real arity break from C1, which is fixed — see the typecheck blind spot below.)
- [ ] **`ai-call-metrics.spec.ts`** — three wall-clock assertions (`< 60ms`, got 94ms). Machine-dependent,
      fails in isolation on this host. Not a correctness defect; the thresholds need a floor that is not
      a bare millisecond count.

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
- [ ] `frontend/features/crm/quotes/components/quote-create-sheet.tsx:77` — `defaultExpiryDate` builds a
      calendar date with `d.toISOString().split("T")[0]`, which is UTC. For a reader east or west of UTC
      near midnight that is off by a day. `lib/date-utils.ts` already exports `formatDateOnly`, which does
      it in local time. Found while consolidating the token-sheet duplication; left alone because it is
      CRM, outside this program's scope. One-line fix. `[V]`
- [ ] `backend/src/modules/auth/auth-passwordless.service.ts` — 451 lines holding three independent
      flows (verify-email `:111-156`, magic-link `:187-333`, email-OTP `:335-451`) that share only
      `findOrCreateUser`. Size/cohesion note, not a defect. `[R]`
- [ ] `frontend/lib/rbac/route-access/route-access-extensions.ts:14-160` — 24 entries whose `reason`
      prose asserts a match with a specific backend gate, while the test
      (`__tests__/route-access-keys.test.ts:44-51`) only checks the key exists in the catalog. The
      file itself records one past drift (`:20`). Consider asserting against the `x-exposure`
      OpenAPI stamp instead of prose. `[R]`
- [ ] Liveness gap in `getMembershipAccessState` — filed as NEWLY DISCOVERED RISK; see
      [PRD-AUTH-CONTEXT.md](PRD-AUTH-CONTEXT.md) §5. Affects the two callers that never pass a guard.

## Explicitly settled — do not re-raise

- `common/rbac/module-availability.ts:46-75` is already the deep module for backend availability.
- `frontend/lib/wizard-gate.ts` — one `resolveWizardGate`, four layouts, no duplication.
- `common/auth/jwt-auth.guard.ts` is dense but each branch cites the incident it prevents.
- The frontend `PERMISSIONS` array being a subset of the backend catalog is deliberate.
- `settings-deprecated-routes.controller.ts` aliases are retained to a documented 2027-03-31 sunset.
- `/chat/moderation` deleted and `/chat/settings` kept are settled product decisions.
- ADR-0001 and ADR-0002 are not contradicted by anything in this PRD.
