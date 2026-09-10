# PRD — Architecture review 2026-09-10: org · login · access · RBAC · settings · module access · API cost

Status: **OPEN** · Baseline commit `db887baad` · Source: architecture review run 2026-09-09/10
Scope approved by the owner: **all eleven candidates**.

Not a lane file. Deliberately **outside** `architecture-refactor/prd/`, because
`frontend/scripts/check-prd-traceability.mjs` reads `architecture-refactor/prd/**` and fails an
unindexed lane. No `PRD-Cnnn` id is created or renumbered here.

**Evidence grade** on every item: `[V]` = verified by reading the cited lines in this session ·
`[R]` = explorer-reported with line anchors, not independently re-read. Re-verify `[R]` before acting.

---

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

## C3 — One owner for branch mutations

`[V]` `BranchesController` (`branches.controller.ts:61-97`, keys `branch:create|update|delete`) and
`OrgHierarchyBranchesService` both write `org_units WHERE kind = 'BRANCH'`.
`cache-invalidation-matrix.ts:126-139` already records both as writers of `branches:list` and
`org:units:BRANCH`. `[R]` No frontend caller issues `POST|PATCH|DELETE /branches`.

- [ ] Re-verify zero frontend callers of the three mutation routes
- [ ] Confirm no backend service, worker, cron or e2e calls `BranchesService.create|update|remove`
- [ ] Delete the three mutation routes from `branches.controller.ts`
- [ ] Delete `create`/`update`/`remove` from `branches.service.ts`
- [ ] Decide the fate of `GET /branches` and `GET /branches/:branchId` — keep the light read, or
      repoint `frontend/hooks/api/branches.ts:21` at `useOrgBranches` and delete the module
- [ ] Update `cache-invalidation-matrix.ts:126-139` to name one writer per namespace
- [ ] Retire the now-unreachable `branch:create|update|delete` catalog keys, or state why they stay
- [ ] Confirm the two dropdown consumers still render (`use-announcement-form.ts`, `job-basics-sections.tsx`)

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

## C6 — One answer to "which module owns this permission key"

`[V]` `administeringModuleOf` (`common/rbac/module-vocabulary.ts:36`) is canonical, and
`backend/CLAUDE.md` §5 says so. Four private naive `split(":")[0]` copies exist:

- [ ] `backend/src/modules/access/access-policy.ts:81` — used at `authorize.ts:27` and
      `stripDeniedModules` (`access-policy.ts:183`). **Not a live hole today** — `home`, `chat`,
      `mail`, `calendar`, `notifications` are all `ladder: "universal"` and
      `denied-modules.resolver.ts:59` filters core modules out of the denied set, so the naive split
      never meets a Home deny. Correct by accident, not construction. `[V]`
- [ ] `frontend/components/rbac/permission-matrix-types.ts:76`
- [ ] `frontend/features/settings/simulate/simulate-page.tsx:48`
- [ ] `frontend/features/settings/api-tokens/permission-scope-selector.tsx:35`
- [ ] Generate a catalog-driven frontend equivalent of `namespacesForModule`/`administeringModuleOf`
      (data mirrored like `PERMISSIONS`, not logic re-implemented)
- [ ] Delete all three frontend copies and repoint their call sites
- [ ] Add a test that a Home-administered namespace groups under Home on the Simulate screen
- [ ] Check the fourth naive split at `sidebar-nav-items.test.ts:236` — test-only, decide keep/fix

---

## C7 — One answer to "is this module enabled" on the frontend

`[R]` `useModuleEnabled` (`hooks/api/access.ts:109-113`, ~50 call sites) does a canonical-key lookup.
`<RequireModule>` (`components/auth/require-module.tsx:37-44`) instead goes through
`useEnabledModules` → `ORG_MODULE_NAME` → `matchesOrgModule` → a second alias table
(`lib/module-vocabulary.ts:15-38`). Route gates and hook gates can therefore disagree.

- [ ] Re-verify both pipelines read the same `useAccess().data.modules`
- [ ] Repoint `<RequireModule>` at `useModuleEnabled`
- [ ] Keep `ORG_MODULE_NAME`/aliases only where the wire format needs the uppercase legacy name
- [ ] Delete `matchesOrgModule` if nothing else uses it after the repoint
- [ ] Test that a route gate and a hook gate agree for `build`/`projects` and `accounting`/`finance`
- [ ] `lib/module-catalog.ts:18-30,44-70` — delete `MODULE_TO_PRODUCT` and the hardcoded
      `EXTRA_MODULES.chat`; derive label from `moduleById(key)?.displayName`, which the manifest
      already carries `[R]`

---

## C8 — Cut the call count on the settings surface

`[V]` `hooks/api/access.ts:65-67` sets `staleTime: 30_000` beside `refetchOnWindowFocus: "always"`;
`"always"` skips the staleness check, so the whole access bundle refetches on every tab focus — and
that hook backs `useCan`, `useModuleEnabled`, `usePermissionGate` and navigation.
`[R]` 22 of 23 `app/(authenticated)/settings/**/page.tsx` have no server prefetch; only
`settings/roles/page.tsx:9` does.

- [ ] Change `refetchOnWindowFocus` to `true` so `staleTime` governs
- [ ] Review `refetchOnReconnect: "always"` on the same query — same class of decision
- [ ] Write `prefetchSettingsSection(section)` mirroring `lib/prefetch/roles.ts` and `access.ts`
- [ ] Add the prefetch call to each page, one per line item:
      api-tokens · audit-log · billing · billing/ai-credits · delegations · modules · webhooks ·
      users · roles (already done) · simulate · organization · organization/branches ·
      organization/business-units · organization/chart · organization/cost-centers ·
      organization/departments · organization/locations · organization/structure ·
      organization/teams — **re-enumerate against the real tree before starting; this list is `[R]`**
- [ ] Confirm each page's server component holds the permission check before prefetching
- [ ] Verify no page double-fetches after hydration

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

## C10 — Settings section shape: schemas out, one form module, missing tests

`[R]` throughout.

**Extract Zod out of `.tsx` (root `CLAUDE.md` §6):**
- [ ] `org-branding-schema.ts` ← `org-branding-section.tsx:38-44`
- [ ] `org-holiday-calendar-schema.ts` ← `org-holiday-calendar-section.tsx:42`
- [ ] `org-localization-schema.ts` ← `org-localization-section.tsx:92`
- [ ] `create-org-token-schema.ts` ← `create-org-token-sheet.tsx:37`
- [ ] `create-user-token-schema.ts` ← `create-user-token-sheet.tsx:37`
- [ ] `cost-center-form-schema.ts` ← `hierarchy/cost-centers-page.tsx:52` — its five siblings
      (branches, business-units, departments, locations, teams) already have one

**File size (§7, 300 target / 500 hard):**
- [ ] `org-branding-section.tsx` 383 lines — split `ColorSwatch` and the upload handler out
- [ ] `org-localization-section.tsx` 339 lines — under 300 once its schema leaves

**Shared behaviour:**
- [ ] Size the win first: 8 sections, 64 occurrences of edit-toggle/toast/`form.reset`, only 4 share
      `useUpdateOrgSettings` (`hooks/api/organization.ts:148`)
- [ ] If it pays, write `useSettingsSectionForm({ schema, defaultValues, mutation })`
- [ ] Migrate the 8 sections

**Tests — only `org-security-schema.test.ts` exists today:**
- [ ] `org-branding` · [ ] `org-business-hours` · [ ] `org-config` · [ ] `org-danger-zone`
- [ ] `org-holiday-calendar` · [ ] `org-incoming-transfer` · [ ] `org-localization` · [ ] `org-profile`
      (test the extracted schema, not the JSX — cheaper and more durable)

---

## C11 — Delete the auth forwarding facade

`[R]` `auth-tokens.service.ts:31-82` — nine of ten methods are one-line delegations; only
`googleOAuth` (`:84-209`) has a body.

- [ ] Move `googleOAuth` to `AuthService` or its own `AuthGoogleService`
- [ ] Repoint `auth.controller.ts` and `auth.service.ts` at `AuthPasswordlessService`,
      `AuthMembershipResolverService`, `AuthAnalyticsService` directly
- [ ] Delete `AuthTokensService` and unregister it from its module
- [ ] Confirm `auth-membership-resolver-isolation.spec.ts` and `auth-passwordless-isolation.spec.ts`
      still cover the same behaviour
- [ ] Inline `backend/src/modules/agent-access/agent-token-ceiling.ts` (7 lines, one constant, one
      caller at `agent-tokens.service.ts:61`) into its caller and delete the file

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
