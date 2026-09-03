# 05 — Authentication, Organization, RBAC and Settings — second-pass audit at head

**Date:** 2026-09-03
**Backend head:** `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`)
**Frontend head:** `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`)
**Prior report:** `reports/05-auth-org-rbac-settings.md` (read in full; every one of its claims was re-tested, not assumed)
**Mode:** READ-ONLY. No file in either repo was edited. This report is the only write.

---

## 0. What changed since the prior audit — and what that closes

Eight backend commits and eight frontend commits landed after the prior report. Three matter here.

| Commit | Effect on this ticket |
|---|---|
| `65a732871` *fix(schema): members who used three features could not be revoked at all* | **Closes D1.** Migrations 1051/1052/1053 landed. `verify:membership-revocation` now **EXIT 0**. |
| `5582f4309` *perf(hooks): resolve response contracts lazily* | **Broke a test in this territory.** `hooks/api/access/use-can.test.tsx` is red at head (F7). |
| `1376d57f9` *feat(migrations): three-bootstrap parity* | The two local databases named in the brief are at journal head, 677/677. |

**D1 is closed, measured, not assumed.** Re-ran the gate against `scratch_head_1010` (677 migrations, 944 tables):

```
DATABASE_URL=postgresql://tarunchintakunta@localhost:5432/scratch_head_1010 \
  node -r ts-node/register src/scripts/verify-membership-revocation.ts
EXIT=0
Removal artifacts: PASS · No inheritance: PASS · Inventory vs FKs: PASS
282 PASS · 0 FAIL · 67 SKIP
```

Prior audit measured **248 PASS / 33 FAIL / 68 SKIP** on a 672-migration database. The 33 FAILs are gone.
**The 67 SKIPs are not.** See F5 — they are not a pass, and the gate cannot distinguish them from one.

---

## 1. Corpus read — with numbers

### Backend territory (`src/modules/{access,rbac,auth,organization,settings,module-access,users,sessions,mfa}`)

| Module | `.ts` files | spec files | controllers | services |
|---|---|---|---|---|
| access | 65 | 41 | 2 | 4 |
| rbac | 96 | 34 | 3 | 9 |
| auth | 21 | 11 | 1 | 5 |
| organization | 134 | 67 | 5 | 34 |
| settings | 16 | 7 | 2 | 2 |
| module-access | 42 | 19 | 2 | 11 |
| users | 18 | 8 | 1 | 4 |
| sessions | 8 | 4 | 1 | 1 |
| mfa | 7 | 2 | 1 | 1 |
| **Total** | **407** | **193** | **18** | **71** |

Route decorators in those 18 controllers: **218** — 83 `@Get`, 66 `@Post`, 34 `@Delete`, 31 `@Patch`, 4 `@Put`.

### Frontend territory

| Path | files | test files |
|---|---|---|
| `features/settings` | 84 | 10 |
| `lib/rbac` | 56 | 12 |
| `features/module-access` | 19 | 6 |
| `hooks/api/module-access` | 8 | 1 |
| `features/portal` | **7** | **0** |
| `hooks/api/access` | 6 | 2 |
| `features/auth` | 6 | 0 |
| `features/organization` | 1 | 0 |
| **Total** | **187** | **31** |

Routes: **23** global `/settings/*` `page.tsx` · **62** module `/<module>/settings/*` · **5** `(auth)` routes ·
**4** gate routes (`/org-setup`, `/employee-onboarding`, `/access-suspended`, `/access-denied`) ·
**3** `(portal)` routes · **545** controllers on disk backend-wide.

`features/portal` is 7 files with **zero** tests. Two of this audit's three highest findings are in it.

### Database (local, at journal head)

| Measure | `scratch_head_1010` |
|---|---|
| public tables | 944 |
| RLS-enabled | 899 |
| carrying `org_id` | 824 |
| carrying `org_id` **without** RLS | **0** |
| RLS policies on tenant tables | 825 |
| `FORCE ROW LEVEL SECURITY` tables | 1 (`external_effect_ledger`) |
| tenant rows seeded | **0** — see §3, C081 |

### Commands actually run (exit codes captured, never through a pipe)

| Command | EXIT | Produced |
|---|---|---|
| `verify:membership-revocation` (owner, head DB) | **0** | 282 PASS / 0 FAIL / 67 SKIP |
| `check:module-gate` | 0 | "Scanned 391 controllers across 22 module folders" |
| `check:module-entitlement` | 0 | 1 module (`timesheets`) |
| `check:scope-application` | 0 | 150 resolutions / 150 applied |
| `check:owner-authority` | 0 | 9/9 enforced, 12 shortcuts |
| `check:permission-keys` | 0 | 3138 usages, 633 unique, catalogs 704/704 |
| `check:idempotent-commands` | 0 | critical-verb subset, 11 named SKIPs |
| `check:record-access` | 0 | 1192 findFirst / 591 record reads |
| `check:navigation-permissions` (backend) | 0 | — |
| `check:cache-invalidation` | 0 | 1076 service files, 187 write / **475 invalidate** sites |
| FE `check:query-scope` | 0 | **5364 files, 0 violations** — see F2 |
| FE `check:gate-wiring` | 0 | 35 gates, 32 able to fail, all reachable |
| FE `check:permission-catalog` / `permission-binding` / `route-access-contract` / `gated-reads` / `empty-states` / `client-pages` / `routes` | 0 ×7 | 2384 bindings, 26 nav files, 3857/5364/600 files |
| FE `jest lib/query-scope-isolation` | **0** | **1 suite / 3 tests PASS** (incl. an anti-vacuity control) |
| FE `jest` (settings, module-access, rbac, access, organization, wizard-gate, prefetch, hooks/common) | **1** | **48 suites / 357 tests — 47 pass, 1 FAIL** |
| BE `jest` (access/authorize/guard/apply-scope/catalog-sync/org-switch/sessions) | 0 | 17 suites / 147 tests |
| BE `jest access-resolution-cost` | 0 | 1 suite / 7 tests |
| psql structural RLS policy audit (824 tables) | 0 | 0 tables without an org predicate |
| psql fail-closed probe as `streamline_app` (`rolbypassrls=f`) | — | 7 of 8 raise `42501`; `organization_members` returns 0 by design |
| psql index audit, 12 access-path tables | — | 40 indexes, **0** tables without an `org_id`-leading btree |

**One correction to my own run:** I invoked `check:navigation-permissions` from the frontend and got exit 1.
That gate does not exist in the frontend `package.json` (69 `check:*` scripts, not that one) — npm exits 1 for a
missing script. It is a **backend** gate and it is **EXIT 0**. Recorded so the intermediate red is not misread.

---

## 2. Findings

| # | Sev | File:line | Summary |
|---|---|---|---|
| F1 | **P1** | `frontend/hooks/api/portal/use-portal-guard.ts:13` · `frontend/lib/portal-api-client.ts:113` | Both portal session-recovery redirects point at `/portal/accept-invitation`, a route that does not exist; it resolves into the authenticated staff area and dumps the client on `/signin?session=expired` |
| F2 | **P1** | `backend/src/modules/access/access-permission.resolver.ts:330` | Delegated permissions read with a bare unordered `.limit(500)` while a delegatee can hold N×200 delegated keys — silent, non-deterministic permission loss, the exact defect `access-grant-drains.ts:35` says a cap cannot fix |
| F3 | **P1** | `backend/src/modules/sessions/sessions.service.ts:76` | `GET /sessions` is unbounded and never filters `expiresAt`; expired sessions are rendered as active in Settings → Security. The admin twin at `user-profile.service.ts:71` has `.limit(50)` |
| F4 | **P1** | `frontend/hooks/api/access/use-can.test.tsx:104` | Red at head. CI runs `pnpm test` unfiltered (`.github/workflows/frontend.yml:177,244`), so the whole frontend test job fails and buries every other suite's signal |
| F5 | **P1** | `backend/src/scripts/verify-membership-revocation.ts:193` | `matches.length === 0` prints SKIP and `continue`s without setting `pass = false`. 67 declared membership relationships have **no FK at all** and the gate reports PASS over them |
| F6 | **P2** | `frontend/features/portal/components/portal-providers.tsx:7` · `frontend/scripts/check-query-scope.mjs:13` | The portal QueryClient carries no identity scope and the gate that enforces scoping allowlists it by path, with no justification comment |
| F7 | **P2** | `backend/src/modules/access/access-permission.resolver.ts:270` | `roleIdList` can hold 1000 ids (500 + 500 from two capped reads) but the `roles` lookup is `.limit(500)`, unordered |
| F8 | **P2** | `frontend/lib/onboarding-gate.ts:20` | `clearGateCookies()` deletes `org-setup-done` / `onboarding-done`; the cookies actually written are `<base>--<scopeId>`. The function is inert |
| F9 | **P2** | `backend/src/scripts/check-module-gate.mjs:33` | 391 of 545 controllers scanned; **16 of this ticket's 18** are outside the walk and `CONTROLLER_MIN = 200` can never catch it |
| F10 | **P2** | `backend/src/modules/rbac/permission-catalog-sync.service.ts:54` | Boot-time `sync()` passes no options, so `cleanupRetired` is falsy and retired permission rows are never removed outside a manual script |
| F11 | **P2** | `backend/src/modules/users/user-profile.service.ts:99` | An org-A admin's `revokeAllSessions` revokes the target's sessions in every other org they belong to; `user_sessions` has no `org_id` |
| F12 | **P2** | `backend/src/modules/rbac/permission-catalog-sync.service.ts:88` | `modulesCatalog` read capped at `.limit(100)`; a 101st module would silently lose its whole permission set at boot |

---

### F1 — P1 — the portal's entire session-recovery path is dead

**Files.**
- `frontend/hooks/api/portal/use-portal-guard.ts:13` → `router.replace("/portal/accept-invitation?reason=no_token")`
- `frontend/lib/portal-api-client.ts:113` → `window.location.href = "/portal/accept-invitation?reason=expired"`

The invitation page lives at `app/(portal)/accept-invitation/page.tsx`. `(portal)` is a route group and adds no
URL segment, so the real URL is **`/accept-invitation`**. There is no `app/portal/` directory, no middleware
(`find . -maxdepth 2 -name middleware.ts` → nothing), and `next.config.ts:115-126` carries exactly two redirects,
neither for portal.

`/portal/accept-invitation` therefore matches `app/(authenticated)/portal/[projectId]/page.tsx` with
`projectId = "accept-invitation"`. That page sits under `app/(authenticated)/layout.tsx:25`, whose first
statement is `await requireSession()`, which for a session-less external client executes
`redirect(signInPathForMissingSession())` → **`/signin?session=expired`**
(`frontend/lib/auth-session-cookies.ts:25-35`).

**Failure scenario.** A client contact's portal JWT expires. Their next portal read returns 401.
`portalFetch` clears the token and hard-navigates to `/portal/accept-invitation?reason=expired`. They land on
the internal staff sign-in page, told their session expired, with no credentials, no portal link, and no path
back. The `MissingTokenView` copy at `accept-invitation/page.tsx:76-92` — which exists specifically to explain
`reason=expired` and `reason=no_token` — is unreachable from either producer of those query values.

**Proposed fix.** Change both strings to `/accept-invitation`. Add a test asserting that every literal the app
redirects to resolves to a `page.tsx` under `app/`; nothing checks route-string validity today
(`check:routes` walks 655 route directories but only looks for business route handlers).

---

### F2 — P1 — delegated permissions are capped at 500, unordered, and can overflow

**File.** `backend/src/modules/access/access-permission.resolver.ts:306-330`

```ts
.from(userDelegationPermissions)
.innerJoin(userDelegations, …)
.where(and(
  eq(userDelegations.orgId, orgId),
  eq(userDelegations.delegateeMembershipId, membershipId),
  eq(userDelegations.status, "ACTIVE"),
  gt(userDelegations.endsAt, now)))
.limit(500)          // ← no .orderBy anywhere in this file
```

`grep -c orderBy access-permission.resolver.ts` → **0**. `grep -c '\.limit('` → **6**.

The write side caps **one** delegation at 200 permissions
(`backend/src/modules/delegations/dto/delegation.schemas.ts:10` — `.array(...).min(1).max(200)`) but nothing
caps the number of concurrently ACTIVE delegations naming the same delegatee: the query filters only on
`delegateeMembershipId` and `status`, never on a delegation id.

**Failure scenario.** An ops lead covers three colleagues on leave. Each hands over 200 permissions
(3 × 200 = 600 rows). The resolver reads 500 of them in whatever order the plan happens to produce and drops
100. Because there is no `ORDER BY`, a heap-order change, an autovacuum, or a plan flip returns a *different*
500 on a later request — so the same person is authorized for an action at 09:00 and denied it at 09:05, with
no error logged in either direction. The effective-permission blob is then cached under
`accessPerms(orgId, userId, version)` for the version's lifetime, so the wrong answer persists.

This is not a hypothetical class. `backend/src/modules/access/access-grant-drains.ts:35-40` documents it in the
repo's own words, for the two reads that *were* converted to keyset drains:

> *"This was a bare, unordered `.limit(500)`. … a member holding nine of them silently lost permissions past the
> 500th, and with no `ORDER BY`, a different set on each request. An authorization decision that is both wrong
> and non-deterministic, raising no error either way. **A larger cap is the same defect with a later trigger.**"*

The conversion reached `drainRolePermissionGrants` and `drainUserPermissionGrants`. It did not reach the
delegation read, nor the four other capped reads at `:153`, `:171`, `:184`, `:210`.

**Proposed fix.** Give `userDelegationPermissions` the same keyset drain the two grant tables have, paging on
`userDelegationPermissions.id`. Failing that, `.orderBy(asc(id))` at minimum, plus an explicit
`if (rows.length === LIMIT) logger.error(...)` so a truncation is never silent.

---

### F3 — P1 — `GET /sessions` is unbounded and shows expired sessions as active

**File.** `backend/src/modules/sessions/sessions.service.ts:76-80`

```ts
const rows = await this.db.query.userSessions.findMany({
  where: and(eq(userSessions.userId, userId), eq(userSessions.isRevoked, false)),
  orderBy: [desc(userSessions.lastActive)],
  columns: { … },
});                       // no .limit(), no cursor, no expiresAt predicate
```

Three independent facts make this bite:

1. **No cap exists by default.** `organizations.max_concurrent_sessions` is nullable with no default
   (`information_schema.columns` on the head DB → `column_default` empty, `is_nullable = YES`).
   `auth-membership-resolver.service.ts:135-137` only calls `enforceMaxSessions` when the cap is non-null,
   so out of the box **nothing ever revokes a session**.
2. **Nothing prunes.** Only 7 non-spec files reference `userSessions` and none deletes a row or runs on a
   schedule. `expires_at` is set to `now + 30 days` at creation and then never read by `list()`.
3. **`list()` itself inserts.** Line 53 inserts a row for any `currentSessionId` it has not seen, so the table
   grows one row per login, forever.

`enforceMaxSessions` at `:193-201` *does* filter `or(isNull(expiresAt), gt(expiresAt, now))`. `list()` does not.
The asymmetry is inside one file.

The admin-facing twin is bounded: `backend/src/modules/users/user-profile.service.ts:71` is the same query with
`.limit(50)`. So the pattern was known and the self-service path was missed.

The frontend renders every row without truncation — `frontend/features/settings/settings-security.tsx:172`,
`{sessions.map((s) => <SessionRow …/>)}` — while the section immediately below it, `RecentSignInsSection`, does
paginate (`useLoginHistory({ page: 1, limit: 5 })`).

**Failure scenario.** A user who signs in daily for a year opens Settings → Security. The response carries ~365
rows. Every one renders as a live device with a working **Revoke** button, including sessions that expired
eleven months ago. The screen whose entire purpose is "spot the device that isn't yours" is unusable, and
`otherSessions.length` in the confirm dialog (`:140`) tells them they are about to sign out 364 devices.
The index `idx_user_sessions_user_revoked_last (user_id, is_revoked, last_active)` covers the query, so this
never shows up as a slow query — it shows up as an enormous response body.

**Proposed fix.** Add `or(isNull(expiresAt), gt(expiresAt, now))` to the `where` at `:77` and a `.limit(50)` to
match the admin path; surface truncation in the response. Separately, a scheduled prune of
`is_revoked = true OR expires_at < now() - interval '30 days'`.

---

### F4 — P1 — a red test in this territory fails the whole frontend CI job

**File.** `frontend/hooks/api/access/use-can.test.tsx:104`

```
● useCan — server prefetch seam › falls back to fetching when HydrationBoundary carries no access cache
  Expected: … ObjectContaining {"safeParse": Any<Function>}
  Received: "/me/access", undefined, {}, [Function anonymous]
```

The test asserts that the 4th argument to `apiClient.get` is a schema object. Commit `5582f4309` made contracts
lazy, so `hooks/api/access.ts:33-35` now passes `lazyContract(() => import("@/hooks/api/access-schema")…)` — a
**function**, not a schema.

**The runtime is correct.** `lib/api-envelope.ts:98-103` `resolveContract` handles both
(`if (typeof source === "function") return source();`) and `lib/api-client.ts:302` awaits it before
`parseApiResponse`. The `/me/access` response is still parsed. This is a stale assertion, not a live defect.

**But it is red at head, and CI is unfiltered.** `.github/workflows/frontend.yml:177` and `:244` both run
`pnpm test --runInBand` with a comment on line 141 explaining that filtering is forbidden precisely because
`jest --testPathPattern=<x>` reports green while everything else burns. So this one stale line turns the
frontend test job red and makes every other suite's result unreadable.

**Proposed fix.** Change the 4th-argument matcher to `expect.any(Function)`, or better, `await` the thunk in the
test and assert the resolved schema has `safeParse` — which keeps the assertion's original meaning.

---

### F5 — P1 — the revocation gate reports PASS over 67 relationships that have no foreign key

**File.** `backend/src/scripts/verify-membership-revocation.ts:190-194`

```ts
if (matches.length === 0) {
  console.log(`  SKIP  ${artifact.table} no FK on [...] references organization_members`);
  continue;                    // ← never sets pass = false
}
```

`driftPass` is the only thing feeding `process.exitCode` for this sub-check (`:444`). A declared membership
relationship with **no FK at all** is therefore indistinguishable from a correct one in the exit code.

Measured at head: **67 SKIPs**. Independently confirmed against `pg_constraint`: of 510 `*_membership_id`
columns across the public schema, **92 across 70 tables carry no FK to `organization_members`**.

In this ticket's own territory, all four verified by direct catalog query:

```
org_units.archived_by_membership_id            has_fk_to_members = f
org_units.updated_by_membership_id             has_fk_to_members = f
organization_people.archived_by_membership_id  has_fk_to_members = f
organization_people.updated_by_membership_id   has_fk_to_members = f
```

(`org_units.head_membership_id` and `organization_people.organization_membership_id` **do** have FKs — so the
absence is per-column, not per-table, which is exactly what makes it easy to miss.)

**Failure scenario.** A member is revoked. `organization_members` row is deleted or cascaded. Every
`org_units.updated_by_membership_id` and `organization_people.archived_by_membership_id` pointing at it keeps
the id with nothing to enforce it. A subsequent GDPR erasure request over that membership cannot be satisfied
by referential action, and any "who last updated this org unit" join silently yields nothing. The bulk of the
67 is HR (`hr_people`, `hr_employments`, `workers`, `hr_leave_ledger`, ~40 more), recruitment, and KB
authorship — so the exposure is wider than this territory.

`65a732871`'s commit message is right that the 33 FAILs were an intent-inventory error rather than schema
drift. The 67 SKIPs are a different thing and were not addressed by it.

**Proposed fix.** Make SKIP fail unless the artifact carries an explicit `noFk: "<reason>"` field in
`MEMBERSHIP_ARTIFACTS`, so every one of the 67 becomes a named, justified exception instead of silence. Add an
anti-vacuity floor asserting the SKIP count does not grow.

---

### F6 — P2 — the portal QueryClient has no identity scope, and the gate allowlists it

**Files.** `frontend/features/portal/components/portal-providers.tsx:7-20` ·
`frontend/scripts/check-query-scope.mjs:10-14`

The authenticated app's isolation is genuinely good, and I verified it rather than trusting it:

- `components/providers/query-provider.tsx:50` sets `queryKeyHashFn: scopedQueryKeyHashFn(scope)`.
- `:90-96` remounts on `key={scope}` where `scope = authenticated:${orgId}:${userId}`.
- `hooks/common/auth-hooks.ts:163-173` — org switch does `clearGateCookies` → `clearBackendTokenCache` →
  `update({orgId})` → `queryClient.clear()` → `router.replace` → `router.refresh()`.
- `lib/query-scope-isolation.test.tsx` — **3 tests pass**, and the third is an anti-vacuity control
  ("proves the guard bites: a plain QueryClient exposes cross-org data").

The portal has none of it:

```ts
const [queryClient] = useState(() => new QueryClient({ staleTime: …, gcTime: …, retry: 1 }));
```

No `queryKeyHashFn`. No `key`. No `registerQueryCacheClearer`. `grep -rn "clear()\|removeQueries\|resetQueries"
features/portal hooks/api/portal "app/(portal)"` → **nothing**. The keys carry no token dimension either:
`lib/query-keys/directory-and-ownership.ts:117,119` are `[...base,"portal","projects"]` and
`[...base,"portal","projects",projectId,"overview"]`.

And the gate that enforces all of this exempts it by path, with no comment:

```js
const SANCTIONED_QUERY_CLIENT = new Set([
  "components/providers/query-provider.tsx",
  "lib/prefetch/server-query-client.ts",
  "features/portal/components/portal-providers.tsx",   // ← line 13
]);
```

`check:query-scope` scans **5364 files** and reports **0 violations**. The one place the property does not hold
is on the allowlist. Note it is absent from `SANCTIONED_HASH_FN`, so the gate never asks the follow-up question.

**Failure scenario (honest about the trigger).** A full page load does construct a fresh QueryClient, so
clicking two invitation emails in sequence does **not** leak — I checked this before writing the finding.
The live path is two tabs, which share `localStorage`:

1. Tab 1 at `/client-portal` under client A's token. `["…","portal","projects"]` caches A's project list;
   opening a project caches `PortalProjectOverview` — milestones, tasks with assignee names, comment bodies with
   author names, and `PortalAttachment.url` (`features/portal/lib/portal-types.ts:36-58`).
2. Tab 2 opens client B's invitation. `accept-invitation/page.tsx:115` writes token B to
   `localStorage["portal_jwt"]`, which Tab 1 shares.
3. `PortalProviders` sets no `refetchOnWindowFocus`, so TanStack's default `true` applies. Focusing Tab 1
   refetches under the **same** key with token B and overwrites A's entry — or, if that fetch 401s or the
   network drops, leaves A's data on screen for a session that is now B's. `portal-api-client.ts:95` reads the
   token per request, so the identity and the cache have already diverged.

The backend is not at fault: `portal-client.controller.ts:28-29` is `@UseGuards(PortalJwtAuthGuard)` and its own
comment records that `PortalClientService` scopes every read to the membership's granted projects. This is
purely a browser-cache defect.

**Proposed fix.** Give `PortalProviders` the same treatment `QueryProvider` has — hash on the portal token
(or a stable claim from it) and `key={token}` the provider so a token change remounts. Then delete line 13 of
`check-query-scope.mjs` so the gate covers the portal instead of excusing it.

---

### F7 — P2 — `roleIdList` can hold 1000 ids against a 500-row `roles` lookup

**File.** `backend/src/modules/access/access-permission.resolver.ts:264-272`

`roleIds` is a `Set` filled from `assignmentRows` (`.limit(500)`, `:153`) and then `groupRoleRows`
(`.limit(500)`, `:210`), so `roleIdList.length` can reach **1000**. The lookup that turns those ids into slugs
is `.limit(500)` with no `ORDER BY`.

Roles missing from `roleById` fall through to `defaults = []` at `:296-299`, contributing nothing. The blast
radius is narrower than F2 because roles carrying explicit grants are served by the unbounded
`drainRolePermissionGrants` regardless — only roles relying on `ROLE_DEFAULT_PERMISSIONS[slug]` lose anything.
Still silent and still order-dependent.

**Proposed fix.** `.limit(roleIdList.length)` — the list is already materialised and its size is known.

---

### F8 — P2 — `clearGateCookies()` clears nothing

**File.** `frontend/lib/onboarding-gate.ts:18-22`

```ts
document.cookie = `org-setup-done=; path=/; max-age=0; …`;
document.cookie = `onboarding-done=; path=/; max-age=0; …`;
```

The cookies actually written are scoped: `gateCookieName(base, scopeId)` = `` `${base}--${scopeId}` `` (`:6-8`),
written at `:31` as `org-setup-done--<orgId>` / `onboarding-done--<userId>` with a 30-day max-age.
The two unscoped names are never set by anything. Both callers —
`hooks/common/auth-hooks.ts:129` (sign-out) and `:165` (org switch) — are no-ops.

**Failure scenario.** HR re-issues onboarding for an employee (server-side `userOnboardingCompletedAt` back to
null) because a policy pack changed. The employee signs in on the same browser. `resolveWizardGate`
(`lib/wizard-gate.ts:34-39`) checks `onboarding-done--<userId>`, finds the 30-day cookie from the first run,
returns `null`, and the mandatory onboarding gate never fires. `clearGateCookies` on their previous sign-out is
exactly the mechanism that should have prevented this, and it did nothing.

**Proposed fix.** Enumerate `document.cookie`, delete every name starting with `org-setup-done--` or
`onboarding-done--`. `lib/wizard-gate.test.ts` already imports `gateCookieName`, so the scoped shape is pinned
on the read side but not the clear side.

---

### F9 — P2 — `check:module-gate` never looks at 16 of this ticket's 18 controllers

Re-measured at head. The gate prints `Scanned 391 controllers across 22 module folders` (visible only with
`--verbose`; the default output is the single word `PASSED`). On disk: **545** controllers.
`grep -oE 'moduleFolder:' src/common/rbac/module-registry.ts` → 23 declarations, 22 non-null.

| Module | in registry | controllers |
|---|---|---|
| access, rbac, auth, organization, module-access, users, sessions, mfa | **no** | 2+3+1+5+2+1+1+1 = **16 unscanned** |
| settings | yes | 2 scanned |

`CONTROLLER_MIN = 200` (`check-module-gate.mjs:33`); 391 clears it comfortably, so the 154-controller hole can
never trip the anti-vacuity floor.

These eight are core/platform modules with no toggleable module identity, so *needing* a module gate is not
obviously true for them. The finding is not "they are ungated" — it is that **a green `check:module-gate` is not
evidence for C113 or C116**, because it looked at 2 of the 18 controllers those criteria are about. Prior audit
found this; it is unchanged at head and worth restating because the default output hides the number.

`check:module-entitlement` is likewise unchanged: 90 lines, no filesystem walk, one module (`timesheets`) of 22.

---

### F10 — P2 — retired permissions are never cleaned up at boot

**File.** `backend/src/modules/rbac/permission-catalog-sync.service.ts:52-54`

`onModuleInit` calls `await this.sync()` with **no argument**, so `options?.cleanupRetired === true` is false and
the whole delete branch (`:135-172`) is skipped. Only `src/scripts/seed-permissions.ts:24` ever passes it.
Observed in the spec run: `WARN [PermissionCatalogSyncService] Permission catalog has 3 retired key(s);
cleanup is disabled`.

The classification logic itself is careful — it takes `FOR UPDATE` locks and refuses to delete a key still
referenced by `role_permission_grants` or `user_delegation_permissions`. The gap is that it never runs in
production. `check:permission-keys` compares the *code* catalog to the *frontend* union (704/704, bijective) and
never consults the `permissions` table, so a stale DB row is invisible to every gate.

**A measurement trap for whoever fixes this.** Both local databases hold **39** `permissions` rows
(`scratch_head_1010` and `scratch_cold_1010` agree exactly), not 704. The catalog is not in the migration
baseline — the reconciler materialises it at Nest boot. Any future gate that reads `permissions` from a
migrated-but-never-booted database will see 39/704 and must not read that as drift.

---

### F11 — P2 — cross-org session revocation

**File.** `backend/src/modules/users/user-profile.service.ts:99-112`

`revokeAllSessions(orgId, userId, actorUserId)` calls `assertMember(orgId, userId)` — correctly proving the
target is a member of the actor's org — and then
`.update(userSessions).set({isRevoked:true}).where(eq(userSessions.userId, userId))` with **no org predicate**.
`user_sessions` has no `org_id` column at all (verified: `\d user_sessions` → 9 columns, none tenant-scoped).

**Failure scenario.** U belongs to org A and org B. An `settings:organization:manage` holder in A revokes U's
sessions. U is signed out of B as well, by an administrator with no authority in B.

Honest counter-argument: a session is one browser login and `switchOrg` reuses it, so a per-org revocation is
not expressible with the current session model. Impact is denial-of-service and annoyance, not data exposure.
Recorded as a design gap with a real trigger, not as a leak.

---

### F12 — P2 — module catalog read capped at 100

`backend/src/modules/rbac/permission-catalog-sync.service.ts:86-89` reads `modulesCatalog` with `.limit(100)`
to build `catalogModules`, which gates `buildPermissionCatalogRows`. There are 22 modules today. A 101st would
have every one of its permissions silently omitted from the catalog at boot. Same shape at `:127`
(`permissions` stale-detection read capped at `.limit(5000)` against a 704-row catalog).

---

## 3. Per-criterion assessment

### PRD-C004 — roll-up — **partially met**

Its two named blockers have moved in opposite directions. **D1 is closed** (§0, EXIT 0 measured at head).
**C112 is no longer blocked** — I ran the frontend evidence the prior audit could not (§C112) and it is largely
green, but it surfaced F1 and F6. Three new P1s (F1, F2, F3) and a red CI job (F4) are open.

### PRD-C081 — BOLA/IDOR — **partially met**, and my re-measure is weaker than the prior audit's on one axis

**What I proved at head, structurally, over all 824 tenant tables:**

| Probe | Result |
|---|---|
| public tables carrying `org_id` | 824 |
| …with RLS enabled | **824** |
| …with `org_id` and **no** RLS | **0** |
| tables with RLS but **no policy** | **0** |
| policies with a `NULL` qual (unconditional) | **0** |
| policies whose `USING` clause does **not** reference the org GUC | **0** |
| total policies on tenant tables | 825 |
| `FORCE RLS` tables | 1 (`external_effect_ledger`) |

Fail-closed with no GUC, as `streamline_app` (`rolbypassrls = f`, `rolsuper = f`): `role_assignments`,
`user_permission_grants`, `roles`, `org_modules`, `module_ownerships`, `access_versions`, `user_module_access`
all raise `42501 no tenant context: app.organization_id is not set for this transaction`. `organization_members`
returns 0 rows rather than raising — its policy is
`((org_id = app.current_org_id_or_null()) OR (user_id = app.current_user_id_or_null()))`, deliberately, so the
org switcher can list a user's memberships across orgs. Read as data, that is 7 of 8 fail-closed and 1
fail-empty-by-design; the prior audit reached the same conclusion on a different database.

**NOT MEASURED, and I will not claim otherwise.** `scratch_head_1010` holds **zero** tenant rows
(`SELECT count(*) FROM organizations` → 0; 0 tables with `reltuples > 0` among the 824). A row-level
cross-tenant sweep here would return "0 leaks" from an empty corpus and prove nothing — the exact trap
`gate-corpus.mjs` documents. The prior audit's 824-table / 0-leak / 70-non-empty sweep was run on a seeded
database and remains the only *data-level* evidence; I could not reproduce it at head without seeding a shared
scratch database that 25 other agents are using.

**Also still NOT COVERED:** no booted-API HTTP test. The 404-vs-403 claim rests on the prior audit's static read
of 145 id-keyed loads across 199 files, not on observed status codes. **What would measure both:** seed two orgs
into a private database (`seed-enterprise-workspace.ts` exists), boot the API, and issue the cross-tenant matrix
— read / write / bulk / file / export / search / realtime / job / share-token — asserting 404 on every miss.
The share-token leg is the one this audit shows most needs it (F1, F6).

### PRD-C111 — bounded membership/session reads, indexes, invalidation — **not met**

- **Resolution reads bounded:** 6 `.limit()` at `access-permission.resolver.ts:153,171,184,210,270,330`, plus
  two unbounded-but-paged keyset drains. Confirmed at head.
- **But two of those caps are reachable and unordered** — **F2** (P1) and **F7** (P2).
- **Session reads are NOT bounded** — **F3** (P1). This criterion says "membership/**session**" reads, and the
  prior audit only walked the resolution path. `GET /sessions` has no limit, no cursor, and no expiry filter,
  while its own admin twin has `.limit(50)`.
- **Indexes: met.** All 12 access-path tables carry an `org_id`-leading btree at head; 40 indexes across them,
  0 tables without one (measured against `pg_indexes` on `scratch_head_1010`, not carried over from the prior
  report's different database).
- **Invalidation: met on the paths I traced.** Org switch invalidates after commit
  (`org-profile.service.ts:186`, outside the `withIdentity` block). `user:session:<userId>` has a real writer at
  `auth.service.ts:228` and 35 invalidation sites. `entitlements.service.ts:335-358` busts every active member's
  session by keyset page with a documented rationale. `check:cache-invalidation` EXIT 0 — but note its own
  numbers: **187 write sites vs 475 invalidate sites**, and it never asks whether an invalidated key has a
  writer, so a 2.5× asymmetry passes unexamined.

### PRD-C112 — frontend/TanStack/tests — **partially met** (was BLOCKED; now measured)

Walked in the order the criterion names them.

| Dimension | Verdict | Evidence |
|---|---|---|
| Workspace / onboarding gates | **met** | `lib/wizard-gate.ts:15-41` — 4 ordered gates (suspended → no-org → owner org-setup → member onboarding); `lib/wizard-gate.test.ts` passes; enforced server-side at `app/(authenticated)/layout.tsx:31-33` before any render. Caveat: **F8**, the gate-cookie reset is inert. |
| Organization switch state | **met** | `hooks/common/auth-hooks.ts:163-173` — the full sequence (gate cookies, backend token cache, session update, `queryClient.clear()`, `replace` + `refresh`). Invalidation is after commit on the backend side. |
| Query-key tenant isolation | **met for the app, not for the portal** | `lib/query-scope-isolation.test.tsx` **3/3 PASS** including an anti-vacuity control; `check:query-scope` 5364 files / 0 violations. But **F6** — the one unscoped client is on the gate's allowlist. |
| Auth error states | **not met** | `DashboardGate` (`components/shared/dashboard-gate.tsx:44-52`) correctly separates "couldn't read your access" from "denied" — the *right* answer to the 500-as-empty-state shape. But **F1**: both portal auth-error redirects are dead URLs. |
| Allow / deny E2E | **partially met** | 48 suites / 357 tests run in this territory; `use-can.test.tsx` covers allow/deny/owner-bypass. **F4**: one suite is red at head. |
| **Cross-tenant E2E** | **NOT MEASURED** | No Playwright suite executed. **What would measure it:** two seeded orgs, a booted app, and a Playwright run that signs in as org A, switches to org B, and asserts no org-A row is ever painted — plus a portal leg exercising two invitation tokens in two tabs, which is exactly F6's trigger. |

Server-side gating on the 23 global settings routes — I checked each one individually:
**20 carry `requirePermission(...)`**, 1 (`/settings`) carries `enforceRouteAccess("/settings")`, and
2 gate client-side only via `DashboardGate` (`/settings/modules` → `settings:manage`,
`/settings/roles/[roleId]` → `settings:rbac:manage`). Both client gates **bite** — `DashboardGate` renders
`AccessDenied` on a miss and does not fail open — and the backing routes are `@RequirePermission`-decorated,
so this is an inconsistency, not a hole. Not counted as a finding.

### PRD-C113 — Zod, OpenAPI, idempotency, owner/descendant — **partially met, unchanged**

- **Zod:** the prior audit's 4 `.strict()` fixes are present at head.
- **Owner/descendant:** `verify:rbac-integrity` and `check:owner-authority` both EXIT 0. `check:owner-authority`
  names 12 owner-shortcut SKIPs explicitly, 3 of them in `module-access`. As the prior audit said, a 9-row
  catalog checking itself is not "exhaustive"; I did not find a counterexample.
- **Idempotency — the gap is byte-for-byte unchanged.** `module-access.controller.ts` lines **102, 115, 239,
  283** still carry no `@Idempotent`, while 180 and 349/363 do. The prior disposition stands: all four are
  upserts against real unique indexes so retries converge, and adding the decorator 400s the route without an
  `Idempotency-Key` header, requiring a paired frontend change.
- **`check:idempotent-commands` EXIT 0 is not evidence here** — it requires the decorator only on a curated
  critical-verb list, and names 11 deliberate SKIPs, none of them these four.

### PRD-C114 — batched/cached/bounded resolution, index coverage — **partially met**

- `access-resolution-cost.spec.ts` re-run at head: **7 tests, EXIT 0**, budgets 2 cold / 0 warm / 1 steady /
  2 without shared cache, asserted as a non-owner.
- `apply-scope.ts` carries no correlated subquery — it takes a materialised `teamIds` array
  (`inArray(cols.teamColumn, cols.teamIds)` at `:25`).
- Index coverage over subject / role / permission / module / tenant: **met**, re-measured (§C111).
- **Scope expansion is bounded but not correct at the boundary** — F2 and F7. "Bounded" and "returns the right
  answer when the bound is reached" are different properties, and the prior audit measured only the first.

### PRD-C116 — global settings hold organization config only — **partially met, unchanged**

Recounted independently at head: **23** global `/settings/*` `page.tsx`, **62** module `/<module>/settings/*`.
Full route list reproduced; every one classifies as organization configuration (10), access governance (7),
my-account (1), platform billing (2), api-tokens/audit-log/webhooks (3). **0 module-owned surfaces and
0 operational work in global settings.**

**The two legacy-redirect violations are still present, byte-identical:**
- `app/(authenticated)/hr/settings/company/page.tsx:6` — 7-line file, `requirePermission` then
  `redirect("/settings/organization")`
- `app/(authenticated)/hr/onboarding/my-tasks/page.tsx:4` — 5-line file named `LegacyMyOnboardingTasksRoute`

Both are ticket-07 files. Blocked there, not here. `/settings/webhooks` remains the one borderline needing a
product ruling (cross-module event catalog, no single owning module).

### PRD-C117 — bounded settings reads, tenant-leading indexes, cache invalidation — **partially met**

- Tenant-leading indexes: **met**, re-measured at head over 12 tables / 40 indexes.
- Bounded settings reads: no unbounded read found in `settings/` (16 files, 1 read, 3 limits). But **F3** sits
  in the adjacent settings surface (Settings → Security renders the unbounded session list).
- **The prior blocker is closed:** `verify:membership-revocation` is EXIT 0 at head. **The residual is F5** —
  67 relationships the gate skips rather than fails, 4 of them in this territory (`org_units` ×2,
  `organization_people` ×2), 92 unenforced `*_membership_id` columns across 70 tables repo-wide.

---

## 4. What head already gets right

Recorded because a finding list on its own misrepresents the state of this territory.

- **RLS is structurally complete.** 824 of 824 tenant tables have RLS, 825 policies, every `USING` clause names
  the org GUC, zero unconditional quals, zero tenant tables without a policy. Seven of eight RBAC tables fail
  closed with `42501` when the GUC is unset; the eighth is a documented, deliberate exception.
- **The effective-permission grant reads were already fixed properly.** `access-grant-drains.ts` replaces two
  caps with keyset drains and its comment is the clearest statement of the defect class I found in either repo.
  F2 and F7 are that same fix not having reached four more sites — the diagnosis is already in the codebase.
- **Query-key isolation in the authenticated app is real and proved.** `key={scope}` remount + scoped
  `queryKeyHashFn` + `queryClient.clear()` on switch, with a test that includes a control demonstrating a plain
  `QueryClient` would leak.
- **`DashboardGate` gets the error-vs-denial distinction right** (`dashboard-gate.tsx:41-52`), which is the
  precise antidote to "a 500 looks like no data." Its comment says so.
- **No provider call inside a transaction anywhere in this territory.** All three auth email sends
  (`auth-passwordless.service.ts:179, 212, 365`) are outside the transaction with compensating updates on
  failure; both invitation sends (`invitation-create.service.ts:221, 308`) are post-commit, fire-and-forget,
  with a delivery-failure recorder.
- **SQLSTATE is read correctly.** `postgres-error.ts:49-71` and `error-classification.ts:22-32` both walk the
  bounded `cause` chain. The repo-wide `err.code === "23505"` trap is closed here.
- **Session-cache invalidation is engineered, not sprinkled.** `entitlements.service.ts:296-322` is a 27-line
  comment justifying keyset paging, `invalidateMany` batching, and an after-commit hook, with the ceiling defect
  it replaced named explicitly.
- **The org switch is thorough on both sides** — post-commit invalidation on the backend, full cache clear plus
  refresh on the frontend.
- **Owner bootstrap is correctly exempted from seat quotas** and the prior audit's `lockMembersQuota`
  consolidation is present at head.
- **Zod strictness holds** on the schemas the prior audit tightened.

---

## 5. Blocked on infrastructure

1. **Cross-tenant data-level probes at head.** `scratch_head_1010` and `scratch_cold_1010` hold zero tenant
   rows. Needs a private seeded database — seeding the shared one while 25 agents use it is not acceptable.
   *Measures:* C081's row-level sweep, the anti-vacuity floor, and the inverse-direction check.
2. **Booted-API BOLA matrix.** Needs the API up with two seeded orgs and two JWTs.
   *Measures:* C081's 404-not-403 claim as observed status codes rather than as a read of 145 load sites.
3. **Playwright cross-tenant E2E.** No E2E suite was executed; none exists in the frontend repo
   (no `playwright.config.*`). *Measures:* C112's last dimension, and would catch **F1** on the first run and
   **F6** with a two-tab portal leg.
4. **Nothing in this report is blocked on another ticket's territory except the two C116 redirect pages**
   (ticket 07), unchanged from the prior audit.

---

## 6. Honest gaps in this audit

- I did **not** re-run the prior audit's 199-file static BOLA walk. I sampled the sessions, users and
  module-access load paths and found the four in F3/F11; I take the rest of that walk on the prior report's
  word.
- I did **not** run `pnpm typecheck`, `next build`, or an unfiltered `jest` in either repo — forbidden by the
  laptop budget. The one red test (F4) was found by a targeted pattern run, so there may be others outside the
  48 suites I ran.
- `check:cache-invalidation`, `check:tenant-isolation` and `check:authz-deny` were run for their exit codes
  only; I did not independently reproduce their internal counts, and the prior report's caveats about their
  reach (13 hardcoded checks; 11 loose regexes one of which is bare `/isolation/i`; 29% handler coverage under
  a ratchet) still apply and I have no reason to think they moved.
- F6's severity rests on the two-tab trigger. I verified that the single-tab, click-both-emails path does *not*
  leak (a full document load builds a fresh `QueryClient`) and downgraded the finding from P1 to P2 on that
  basis rather than leaving the stronger claim standing.
- `access-permission-members.resolver.ts:133,142,157` carries three more unordered `.limit(500)` reads of the
  same shape as F2, on the "who holds permission X" path used for routing and notifications. I did not trace
  their reachability far enough to state a failure scenario, so they are **not** listed as findings — only
  flagged here for whoever fixes F2, since the fix is the same one.
