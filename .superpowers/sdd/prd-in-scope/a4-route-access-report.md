# A4 Route-Access Report

## Premise verdicts

| Premise | Verdict |
|---|---|
| "universal ROOT matches by prefix so admin descendants inherit access" | VERIFIED — old `exact: false` + no exclusion would inherit. UNIVERSAL_EXCLUSIONS and extensions already mitigated it, but the architecture was exclusion-list-based (opt-out), not allowlist-based (opt-in). |
| "payroll/layout.tsx already calls enforceRouteAccess" | VERIFIED TRUE — no work needed there. |
| "notifications/layout.tsx has no auth check" | VERIFIED TRUE — fixed. |
| "knowledge/layout.tsx has no auth check" | VERIFIED TRUE — fixed. |
| "inventory/layout.tsx only calls requireSession" | VERIFIED TRUE — fixed. |
| "portal/layout.tsx has no auth check" | VERIFIED TRUE — fixed. |

---

## Layout classification (all 29 under app/(authenticated))

| Layout | Classification |
|---|---|
| `layout.tsx` (root authenticated) | intentionally-universal — wizard gate + MFA check; runs before all child layouts |
| `accounting/layout.tsx` | already-enforced — `requirePermission("accounting:read")` |
| `accounting/settings/layout.tsx` | intentionally-universal — client-only tab nav; parent accounting layout enforces |
| `billing/layout.tsx` | already-enforced — `enforceRouteAccess` |
| `build/layout.tsx` | already-enforced — `enforceRouteAccess` |
| `build/[projectId]/layout.tsx` | already-enforced — backend fetch returns 403/404 custom views; requires backendJwt |
| `build/workspaces/[pmWorkspaceId]/layout.tsx` | already-enforced — `requireSession` + backend workspace check (parent build layout also enforces) |
| `build/workspaces/[pmWorkspaceId]/[projectId]/layout.tsx` | already-enforced — `requireSession` + backend project check (parent enforces) |
| `crm/settings/layout.tsx` | intentionally-universal — client-only tab nav; CRM module layout enforces upstream |
| `hr/documents/templates/[templateId]/edit/layout.tsx` | already-enforced — `requirePermission("hr:documents:manage")` |
| `hr/layout.tsx` | already-enforced — `enforceRouteAccess` |
| `hr/recruitment/layout.tsx` | already-enforced — `requirePermission([...])` |
| `hr/settings/layout.tsx` | intentionally-universal — client component; uses `useAccess` for tab visibility; parent hr layout enforces |
| `inventory/layout.tsx` | **now-enforced** — changed from `requireSession` to `enforceRouteAccess` |
| `knowledge/layout.tsx` | **now-enforced** — was pass-through, now `enforceRouteAccess` |
| `knowledge/wiki/layout.tsx` | **now-enforced** — was pass-through, now `enforceRouteAccess` |
| `mail/layout.tsx` | **now-enforced** — changed from `requireSession` to `enforceRouteAccess` |
| `notifications/layout.tsx` | **now-enforced** — was bare nav render with no auth, now `enforceRouteAccess` |
| `payroll/layout.tsx` | already-enforced — `enforceRouteAccess` |
| `portal/layout.tsx` | **now-enforced** — was empty pass-through, now `enforceRouteAccess` |
| `settings/layout.tsx` | already-enforced — `enforceRouteAccess` |
| `settings/roles/[roleId]/layout.tsx` | already-enforced — `requirePermission("settings:rbac:manage")` |
| `settings/roles/audit/layout.tsx` | already-enforced — `requirePermission("audit-log:read")` |
| `settings/roles/simulate/layout.tsx` | already-enforced — `requirePermission("settings:rbac:manage")` |
| `support/layout.tsx` | already-enforced — `enforceRouteAccess` |
| `support/reports/layout.tsx` | intentionally-universal — client-only tab nav; parent support layout enforces |
| `support/settings/layout.tsx` | intentionally-universal — pass-through div; parent support layout enforces |
| `timesheets/layout.tsx` | already-enforced — `enforceRouteAccess` |
| `workflows/layout.tsx` | already-enforced — `enforceRouteAccess` |

**Layouts changed: 6** (notifications, knowledge, knowledge/wiki, mail, inventory, portal)

---

## Architecture change: exclusion-list → allowlist

### Old design (removed)
- `UNIVERSAL_ROUTES` entries used `exact: false` → blanket prefix matching for all descendants
- `UNIVERSAL_EXCLUSIONS` opted specific admin paths back OUT of universal access
- Risk: new admin pages forgot without adding to exclusions would inherit universal access

### New design
- `UniversalRoute` has two opt-in fields:
  - `subtree: true` — entire descendant tree is universal (only for surfaces with provably no admin sub-paths)
  - `universalDescendants` — explicit list of `UniversalDescendant` entries
- `UniversalDescendant` supports: exact (default), `subtree: true` (self + children), `childrenOnly: true` (children only, not self)
- `UNIVERSAL_EXCLUSIONS` array removed entirely
- Extension registry (`ROUTE_ACCESS_EXTENSIONS`) handles all admin gates; extensions are checked BEFORE universal matching in `resolveRouteAccess`
- `/directory` changed from `subtree: true` → exact-only; person profiles resolve through the nav registry (fail-closed for new descendants by default)

---

## Universal roots with enumerated descendants

### `/notifications`
- Root: `/notifications` — universal
- Universal descendants: `/notifications/preferences` (subtree)
- Admin descendants in extension registry (verified in both catalogs):

| Path | Permission key | FE catalog | BE catalog |
|---|---|---|---|
| `/notifications/providers` | `notifications:providers:view` | `permission-key-business.ts` | `notifications.ts` |
| `/notifications/templates` | `notifications:templates:view` | `permission-key-business.ts` | `notifications.ts` |
| `/notifications/events` | `notifications:events:view` | `permission-key-business.ts` | `notifications.ts` |
| `/notifications/policy` | `notifications:policy:view` | `permission-key-business.ts` | `notifications.ts` |
| `/notifications/broadcasts` | `notifications:broadcasts:view` | `permission-key-business.ts` | `notifications.ts` |

Note: `/notifications/analytics` does not exist as a route currently (no page file found).

### `/knowledge` (complex)
- Root: `/knowledge` — universal (exact)
- Universal descendants: `/knowledge/wiki` (exact), `/knowledge/wiki/favorites` (subtree), `/knowledge/wiki/recent` (subtree), `/knowledge/wiki/shared` (subtree), `/knowledge/wiki/private` (subtree), `/knowledge/wiki/pages` (subtree), `/knowledge/wiki/spaces` (childrenOnly — individual spaces universal, management list is not), `/knowledge/wiki/chat` (subtree)
- Admin descendants in extension registry:

| Path | Permission key | FE catalog | BE catalog |
|---|---|---|---|
| `/knowledge/wiki/settings` | `kb:settings:manage` | `permission-key-foundation.ts` | `kb.ts` |
| `/knowledge/wiki/import` | `kb:pages:import` | `permission-key-foundation.ts` | `kb.ts` |
| `/knowledge/wiki/analytics` | `kb:analytics:view` | `kb.ts` (FE Permission obj) | `kb.ts` |
| `/knowledge/wiki/reviews` | `kb:reviews:view` | `permission-key-foundation.ts` | `kb.ts` |
| `/knowledge/wiki/spaces` (list) | `kb:spaces:view` | `kb.ts` (FE Permission obj) | `kb.ts` |
| `/knowledge/wiki/templates` | `kb:templates:manage` | `permission-key-foundation.ts` | `kb.ts` |
| `/knowledge/wiki/trash` | `kb:pages:purge` | `permission-key-foundation.ts` | `kb.ts` |

### `/chat`
- Root: `/chat` — universal (exact)
- Universal descendants: `/chat/channels` (subtree), `/chat/invite` (subtree — user-facing token accept)
- Admin descendants: none with current routes. `chat:org-settings:manage` and `chat:invite-links:manage` exist in both catalogs (`permission-key-foundation.ts` lines 201-202 / backend `chat.ts`) but no admin pages currently exist. Extensions will be added when those routes are created.

### `/calendar`
- Root: `/calendar` — universal (exact, no subtree)
- No administrative descendants exist currently.

### `/directory`
- Root: `/directory` — universal (exact only, no subtree)
- Individual person profiles at `/directory/[personId]` resolve through the nav registry — not universally prefix-matched, which is the fail-closed default.
- Admin descendant added to extension registry:

| Path | Permission key | FE catalog | BE catalog |
|---|---|---|---|
| `/directory/workers` | `directory:workers:view` | `directory.ts` + `permission-key-extended.ts` | `directory.ts` |

### Routes with `subtree: true` (entire subtree is universal)
`/dashboard`, `/home`, `/me`, `/mail`, `/announcements`, `/hr/announcements`, `/kb`, `/docs`, `/knowledge-base`, `/support/my`, `/referrals`, `/jobs`, `/access-denied`, `/access-suspended`

### Routes exact-only
`/settings` (personal landing page only), `/calendar`, `/directory` (changed from subtree)

---

## Count of protected descendants declared
**13 protected descendants** explicitly enumerated in ROUTE_ACCESS_EXTENSIONS (12 pre-existing + `/directory/workers` added).

---

## Validation output

### `pnpm type-check`
```
> tsc --noEmit
(zero errors, clean exit)
```

### `pnpm check:route-access-contract`
```
Navigation source files   26
Permission keys checked   197 (17 excluded as access rungs or non-permissions)
x-permission in contract  620

✔  every route-access permission names an endpoint in the generated contract.
```

### `pnpm check:route-access-contract:self-test`
```
✔  self-test passed: a nav key with no backing endpoint is reported as a ghost
✔  self-test passed: a generated <module>:access:* rung is excluded, not reported
✔  self-test passed: node: import specifiers are excluded
✔  self-test passed: registry sentinels are excluded
✔  self-test passed: a key backed by an endpoint is not reported
✔  self-test passed: a broken source walk refuses to report a pass
✔  self-test passed: a truncated contract refuses to report a pass
✔  self-test passed: healthy counts pass the vacuity floors
✔  All self-test cases passed — check-route-access-contract bites.
```

### `pnpm check:navigation-permissions`
Script does not exist in this repo — skipped.

### Jest route-access tests
```
PASS lib/rbac/route-access/__tests__/no-legacy-role-gates.test.ts
PASS lib/rbac/route-access/__tests__/route-access-keys.test.ts
PASS lib/rbac/route-access/__tests__/universal-route-matrix.test.ts
PASS lib/rbac/route-access/__tests__/route-access-coverage.test.ts
PASS lib/rbac/route-access/__tests__/page-level-gates.test.ts

Test Suites: 5 passed, 5 total
Tests:       32 passed, 32 total
Time:        4.472 s
```

---

## Out-of-ownership needs

None. All changes fell within the declared scope:
- `frontend/lib/rbac/route-access/**` — universal-routes.ts, route-access-extensions.ts, __tests__/route-access-keys.test.ts, __tests__/universal-route-matrix.test.ts (new)
- `frontend/app/(authenticated)/**/layout.tsx` — notifications, knowledge, knowledge/wiki, mail, inventory, portal
