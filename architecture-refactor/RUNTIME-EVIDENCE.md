# RUNTIME-EVIDENCE.md — L53 Runtime Observation Report
Generated: 2026-08-30  Lane: L53  
Conditions: localhost loopback, Windows 11, headless Chrome/Edge via CDP, `next build && next start` (production mode)

---

## Test Account

| Field | Value |
|---|---|
| Email | `l53-owner@test.streamlineos.dev` |
| Auth | Passwordless magic-link only. No password column exists in this codebase — `accounts` table holds OAuth tokens, not credentials. Argon2id is not applicable. |
| userId | `45200aba-fee9-4fc5-90eb-6ce7af097112` |
| orgId | `2cbb9a74-552b-4382-91ff-ea5a2dc8adcd` |
| org name | `L53 Test Corp` |
| Role | OWNER / isOrgOwner=true |
| Setup | `POST /auth/register` → sets `email_verified=NOW()`, creates org + OWNER membership + subscription + system roles (seeded by `seedSystemRolesForOrg`). `onboarding_completed_at` set on both `organizations` and `users` tables via direct SQL. Magic link token created with known raw value `L53Test2c806ad73fe6fb0cc10006d63309e4a7bd3accac`, verified via `POST /auth/magic-link/verify`, returned `userId+orgId+sessionId`. |

---

## Service Boot

| Service | Result |
|---|---|
| Backend (NestJS, port 1500) | **BOOTED** — `GET /health` → `{"success":true,"data":{"status":"ok"}}` |
| Backend dist state | Stale dist: `OutboxModule` added to source after last build, not reflected in compiled `FinanceArModule`. Rebuilt with `nest build --builder swc` (transpile-only, no typecheck). Boot succeeded. Accounting typecheck errors (fixed by another lane before this run) did not block boot. |
| Frontend (Next.js, port 1000) | **BOOTED** — `pnpm build` produced 463 pages, zero errors, `pnpm start` serving on port 1000. |
| RLS status | Confirmed fail-closed by coordinator: `42501: no tenant context: app.organization_id is not set` on un-contexted queries. All our request-scoped queries passed the tenant GUC correctly (no 42501 observed in any authenticated request). |
| APP_DATABASE_URL | Points at `streamline_app` role (not owner). All queries run under RLS. `pnpm db:bootstrap-role` already run by coordinator — 1000/1000 tables granted, `bypassrls=false`. |

---

## Background Errors (pre-existing, not from our flows)

Multiple background sweep workers log at `error` level:  
`[sweep-worker] organization sweep failed … has no region`  
These affect legacy orgs in the DB that predate region placement. Our test org has `region=primary`. These are pre-existing and unrelated to our test flows.

---

## API Flow Results (authenticated as OWNER)

JWT: HS256, `aud=streamlineos-api`, `iss=streamlineos-web`, UTF-8 secret (TextEncoder, not base64).

| Endpoint | HTTP | Result | Backend 42501? | Notes |
|---|---|---|---|---|
| GET /me | 200 | `userId`, `role=OWNER`, `isOrgOwner=true`, `membershipId=125` | None | RLS context correct |
| GET /organization | 200 | Returns org `L53 Test Corp` with role, joinedAt | None | |
| GET /organization/settings | 200 | Full org settings object (timezone, currency, region=primary) | None | |
| GET /calendar/events | 200 | `events=[], failures=[], truncated=false` | None | Empty — fresh org |
| GET /calendar/sources | 200 | Returns source list: calendar-events, tasks, build, etc. | None | Real catalog data |
| GET /notifications | 200 | `[]` | None | Empty — fresh org |
| GET /build | 200 (after seeding project 197) | `data=[{id:197, name:"L53 Test Board"}], total=1` | None | Real data after create |
| GET /build/197 | 200 | Full project record | None | |
| GET /build/197/tickets | 200 | `data=[], total=0` | None | Empty board |
| GET /chat/channels | 200 | `[]` | None | Empty — fresh org |
| GET /dashboard/stats | 200 | `totalEmployees=1, activeProjects=0 (pre-project), orgName=L53 Test Corp` | None | Real data |
| GET /billing/entitlements | 200 | `tier=PAID, plan=STARTER, seatLimit=10, lockedModules=[]` | None | Real entitlement data |
| GET /hr/employees | 200 | Returns owner user with name, email, role=OWNER | None | Real employee data |
| GET /hr/employees?search=test | 200 | Filters correctly to owner user | None | Search filter works |
| GET /roles | 200 | System roles seeded (ACCOUNTING_MODULE_ADMIN, etc.) | None | Real data |
| GET /directory/people | 200 | `data=[], hasMore=false` | None | Different from /hr/employees |

---

## API Defects / Findings

### FINDING-1: POST /build requires Idempotency-Key header
- `POST /build` without `Idempotency-Key` → 400 `"An Idempotency-Key header is required for this operation"`
- Expected: documented behavior per `@Idempotent` decorator. The frontend must supply this header; confirmed functional once supplied.

### FINDING-2: GET /build/projects → 400 (wrong route used in initial test)
- `/build/projects` returns 400 `"projectId Invalid input: expected number, received NaN"` — this route resolves to `/build/:projectId` with `projects` parsed as a non-integer. The correct list route is `GET /build`. Not a defect; caller error.

### FINDING-3: GET /hr/employees?status=ACTIVE → 400 VALIDATION_FAILED
- Adding `?status=ACTIVE` → `400 VALIDATION_FAILED: "Unrecognized key: status"`. The frontend may be passing this filter key. If the frontend calls this, it will silently fail validation and the page will error.

### FINDING-4: Settings org path — not a defect
- `/settings/organization` → 404 (wrong test path). Correct path per frontend hooks: `/organization/settings` → 200. Not a defect.

---

## Frontend Page Observations

**LIMITATION:** The browser driver does not support interactive authentication (no cookie injection, no form submission). It navigates to URLs and measures timing via CDP. Pages that require an authenticated session redirect to `/signin`. All authenticated page observations are therefore based on: (a) direct API call results above, and (b) static HTML analysis of the served page source.

### Pages observable unauthenticated (redirect target: `/signin`)

| Page | Result |
|---|---|
| `http://localhost:1000` (root) | Redirects to `/signin` — 200 on redirect target |
| `http://localhost:1000/signin` | Renders: `lang=en`, viewport meta OK, skip-to-content link present, `aria-label` present, `focus-visible` classes present, 8 responsive breakpoint classes (`sm:`, `md:`, `lg:`) in initial HTML |

### Authenticated pages (API-proxy observation only)

Home dashboard stats (`/dashboard/stats`): `totalEmployees=1, activeProjects=0, orgName=L53 Test Corp` — real data rendered.  
Calendar: events endpoint returns correctly with source catalog populated.  
Build board: Project 197 created and retrieved; tickets list empty (correct for fresh board).  
Settings: `/organization/settings` returns full org config object.  
HR/Directory: `/hr/employees` returns owner employee record.  

**Cannot assert:** responsive layout at 375/768/1280 for authenticated pages, keyboard tab order for authenticated pages, focus ring visibility for interactive controls behind auth.

---

## Browser Performance (unauthenticated, localhost loopback)

| Page | Samples | p95-TTFB | p75-FCP | Verdict |
|---|---|---|---|---|
| `/` (root redirect) | 3 | 26.8ms | 172ms | Both MET (targets: 150ms / 1000ms) |
| `/signin` | 3 | 14.8ms | 110ms | Both MET |
| `/signin` (5-sample warm) | 5 | 13.9ms | 64ms | Both MET |

**Caveat:** All measurements are localhost loopback with no network cost. These show parse/render time, not production network conditions.

---

## Accessibility Observations (signin page HTML)

| Check | Result |
|---|---|
| `<html lang="en">` | PRESENT |
| `<meta name="viewport">` | PRESENT |
| Skip-to-content link | PRESENT (`Skip to content`) |
| `aria-label` attributes | PRESENT in HTML |
| `focus-visible` classes | PRESENT (Tailwind `focus-visible:` utilities) |
| `role=` attributes | NOT in initial HTML (likely added by client JS) |
| `prefers-reduced-motion` — CSS | PARTIAL: `globals.css` has `@media (prefers-reduced-motion: reduce)` targeting 3 specific animated CSS classes (`brand-sweep`, `goal-everything-chip`, `preview-goal-marquee-track`). Not a global `animation: none` reset. |
| Framer Motion animations | NOT suppressed globally by CSS. Framer Motion's `useReducedMotion` hook must handle this at runtime — cannot verify without an authenticated browser session. |

---

## REAL DEFECTS FOUND

### DEFECT-1: GET /hr/employees?status=ACTIVE → 400 VALIDATION_FAILED
- **Path:** `GET http://localhost:1500/hr/employees?status=ACTIVE`
- **Status:** 400 `{"code":"VALIDATION_FAILED","message":"Validation failed.","details":[{"path":"body","message":"Unrecognized key: \"status\""}]}`
- **Impact:** If the frontend HR employee list page passes `status` as a query param (common for filtering), the API will reject it and the page will show an error state instead of the employee list.
- **Backend log:** No 42501. Clean 400 from Zod validation.

### DEFECT-2: Backend dist was stale at boot
- **Evidence:** Compiled `finance-ar.module.js` lacked `OutboxModule` import that was present in source. Backend refused to start with existing dist.
- **Fix applied (not a code change):** Rebuilt with `nest build --builder swc`.
- **Impact:** Any CI/CD environment relying on a cached dist from before `OutboxModule` was added to `FinanceArModule` will fail to boot. Requires a fresh build.

### DEFECT-3: prefers-reduced-motion not applied globally
- **Evidence:** `globals.css` only suppresses animation on 3 named CSS classes. Framer Motion animations (translate, scale) on authenticated pages are not covered by CSS-level suppression.
- **Risk:** Users with `prefers-reduced-motion: reduce` will still see translate/scale animations from Framer Motion unless each component implements `useReducedMotion()`.
- **Cannot confirm:** Whether Framer Motion components actually implement `useReducedMotion` — would require authenticated browser session.

---

## COULD NOT OBSERVE

1. **Authenticated page rendering in browser** — browser driver uses a fresh headless Chrome with no session cookies. All authenticated routes redirect to `/signin`. Responsive layout (375/768/1280), keyboard tab order, focus ring visibility, and actual data rendering in the browser are not verifiable without an authenticated browser session.
2. **Chat real-time behavior** — Ably capability check (`chat:${orgId}:*`) requires a real WebSocket connection and channel subscription. API endpoint `/chat/channels` returns 200 with empty array; real-time messaging flow not exercised.
3. **Framer Motion useReducedMotion implementation** — Cannot observe whether individual authenticated-page components call `useReducedMotion()`. Requires authenticated browser session or source audit.
4. **Table→card responsive transformation** — The `mobileCard` layout behavior at 375px requires authenticated page rendering in a real browser at that viewport width.
5. **Filter Drawer collapse behavior at <md** — Cannot observe without authenticated browser session.
6. **Post-commit hook correctness** — After-commit hooks run asynchronously. The coordinator confirmed they fire correctly, but the specific hook for notification dispatch after project creation was not verified end-to-end.
7. **RLS on mutations** — Tested GETs only. POST /build (with idempotency key) succeeded, but cross-tenant write isolation was not probed.
