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

## C2 — One resolver for the session claims shape

`[R]` ~14 fields hand-typed and hand-defaulted at 11 sites; `orgOnboardingCompletedAt` alone appears
9 times. The `session()` catch path (`frontend/lib/auth.ts:256-276`) has already drifted from the
happy path — missing `branchId`, `plan`, `enabledModules`.

- [ ] Re-verify the 11 declaration sites and the catch-path drift against current source
- [ ] Define `SessionClaims` in one place; derive `next-auth.d.ts` augmentations from it
- [ ] Write `resolveSessionClaims(fresh, token)` — one precedence rule per field, pure, no NextAuth
- [ ] Rewrite `frontend/lib/auth.ts` `jwt()` (`:129-181`) to call it
- [ ] Rewrite `session()` happy path (`:183-255`) to call it
- [ ] Rewrite `session()` catch path (`:256-276`) to call it — this deletes the drift
- [ ] Rewrite `signIn()` field copying (`:81-127`) to call it
- [ ] Rewrite `buildUserFromSessionData` (`frontend/lib/auth-session.ts:212-237`) to call it
- [ ] Reconcile with the backend shape (`auth.service.ts:209-227` and the duplicate at `:308-331`)
- [ ] Unit-test `resolveSessionClaims` directly: every fallback branch, and stale-token precedence
- [ ] Confirm no field is defaulted in two places afterwards

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

## C4 — Wire Support automations to its module-owned adapter

`[V]` `SupportAutomationsController` (`support-automations.controller.ts:47-67`) is built, module-gated,
permission-scoped, ticket-trigger-prefixed and audited — and nothing calls it. Every automation hook
(`frontend/hooks/api/automations.ts:134-213`) targets the global `/settings/automations`.

- [ ] Add Support-scoped hooks (or parameterise the shared ones) to call `/support/automations`
- [ ] Repoint `frontend/app/(authenticated)/support/settings/automations/page.tsx`
- [ ] Verify list · create · update · toggle · delete · test all map to the module controller
- [ ] Confirm the audit trail via `SupportSettingsAuditService` actually records the writes
- [ ] Leave Accounting on the global route — it has no module adapter — and say so in the census
- [ ] Update `settings-surface-census.spec.ts:125-152`: Support is no longer `PENDING-MOVE`
- [ ] Create the missing decision artifact `reports/19b-automations-rung-decision.md`, or delete the
      reference to it — the census cites a file that does not exist `[R]`

---

## C5 — Make an unspent DataScope unrepresentable

`[R]` `apply-scope.ts:11-36` returns a bare string; the invariant is policed by
`check-scope-application.mjs` (329 lines, ~10 classification branches) across 30 named resolvers and
132 call sites. Largest migration in this PRD — treat as its own program.

- [ ] Design the branded `ScopedPredicate` and prove it cannot be stringified or compared to `"none"`
- [ ] Prototype on ONE module end to end before touching the other 53 call sites
- [ ] Confirm it composes with Drizzle `and()`/`where()` without a cast
- [ ] Confirm it still works where the scope reaches a raw `sql` template
- [ ] Migrate call sites module by module, one commit each
- [ ] Delete `check-scope-application.mjs` only when zero call sites remain on the string form
- [ ] Keep the scanner running until then — do not retire the gate first

---

## C6 — One answer to "which module owns this permission key" · **FRONTEND DONE (wave 2)**

`[V]` `administeringModuleOf` (`common/rbac/module-vocabulary.ts:36`) is canonical, and
`backend/CLAUDE.md` §5 says so. Four private naive `split(":")[0]` copies existed:

- [ ] `backend/src/modules/access/access-policy.ts:81` — used at `authorize.ts:27` and
      `stripDeniedModules` (`access-policy.ts:183`). **Not a live hole today** — `home`, `chat`,
      `mail`, `calendar`, `notifications` are all `ladder: "universal"` and
      `denied-modules.resolver.ts:59` filters core modules out of the denied set, so the naive split
      never meets a Home deny. Correct by accident, not construction. `[V]` **Still open** — held back
      from wave 2 so the backend tree stayed quiet for the gate.
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
- [ ] C4 follow-up lane sweeping its files
- [ ] Every later wave's frontend lane carries this rule in its brief
- [ ] GATE: sweep the program's touched `.tsx` files for inline JSX closures before sign-off

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

## C9 — Membership write and cache bust as one call

`[R]` `bustMembershipStatusCache` is called from 13 sites across 9 files; repo-wide there are 523
`cache.invalidate*` call sites across 167 files. A missed site under-invalidates and serves stale
authorization — correctness-adjacent, not merely slow.

- [ ] Enumerate the 13 membership-cache call sites and confirm the count
- [ ] Design a mutation module that performs the row write and the bust in one transaction
- [ ] Migrate: `invitation-acceptance.service.ts:178` · `org-membership.service.ts:215` ·
      `org-membership-access-revocation.ts:350` · `org-setup-resolver.service.ts:206` ·
      `users.service.ts:158,217,364,431` · `user-ops.service.ts:323` ·
      `employee-onboarding.service.ts:182,314` · `gdpr-subject-erasure.service.ts:226` ·
      `ownership-transfer-response.service.ts:52`
- [ ] Confirm `bumpPermissionsVersion` still runs in the same transaction where required
- [ ] Add a test that the write and the bust cannot be separated

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

## Appendix — findings that did not become cards

Recorded so they are not lost. None is approved work; each needs a decision.

- [ ] `frontend/lib/auth-session.ts:150-157` — `fetchSessionDataWithCache(userId, _orgId)` takes an
      `orgId` it never reads, purely to key React `cache()`. Either drop the parameter or make the
      function genuinely org-sensitive. Cosmetic today, misleading later. `[R]`
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
