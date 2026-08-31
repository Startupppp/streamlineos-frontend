# L53 Runtime Evidence Report
Date: 2026-08-30  
Lane: L53 — Runtime Observation (the application actually running)

---

## Summary

Both services booted. Backend rebuilt with `nest build --builder swc` due to stale dist (see DEFECT-2). Frontend built 463 pages with zero errors. All authenticated API flows returned real data with no RLS errors. Three defects found. Significant cannot-observe gaps due to browser driver not supporting authenticated sessions.

---

## Test Account Seeded

| Field | Value |
|---|---|
| Email | `l53-owner@test.streamlineos.dev` |
| Auth method | Passwordless only. No password column in this codebase. |
| userId | `45200aba-fee9-4fc5-90eb-6ce7af097112` |
| orgId | `2cbb9a74-552b-4382-91ff-ea5a2dc8adcd` |
| Role | OWNER / isOrgOwner=true |

Seeding steps: `POST /auth/register` → SQL update `onboarding_completed_at` on org and user → insert `magic_link_tokens` row → `POST /auth/magic-link/verify` returned `sessionId=8ca2d39a-96cb-49de-8a6c-a0a0ad8c2751`. No Argon2id applied — auth system has no password mechanism.

---

## Service Boot

- **Backend:** BOOTED after SWC rebuild. Existing dist was stale: `OutboxModule` had been added to `FinanceArModule` source after the last build, so compiled dist lacked it and threw `UnknownDependenciesException` at boot. SWC rebuild fixed this. No typecheck errors blocked boot (accounting errors were fixed by another lane).
- **Frontend:** BOOTED. `pnpm build` completed with 463 pages, zero errors. `pnpm start` serving on port 1000.

---

## Flows Exercised

### Sign-in
- Magic link verified: `POST /auth/magic-link/verify` → 200 `{userId, orgId, sessionId}` ✓
- JWT signed with HS256 (`aud=streamlineos-api`, `iss=streamlineos-web`, UTF-8 secret) → `GET /me` → 200 `{role=OWNER, isOrgOwner=true}` ✓

### Home
- `GET /dashboard/stats` → 200: `totalEmployees=1, activeProjects=0, orgName=L53 Test Corp` — **real data** ✓
- `GET /notifications` → 200: `[]` — **empty state** (fresh org, correct)
- No 42501 in backend log ✓

### Unified Calendar
- `GET /calendar/events?start=2026-08-01&end=2026-09-30` → 200: `events=[], failures=[], truncated=false` — **empty state** (correct)
- `GET /calendar/sources` → 200: returns full source catalog (calendar-events, tasks, build, holidays, etc.) — **real data** ✓
- No 42501 ✓

### Chat
- `GET /chat/channels` → 200: `[]` — **empty state** (fresh org, no channels seeded)
- Real-time WebSocket/Ably flow NOT exercised (not observable without authenticated browser)

### Build Board
- Created project: `POST /build` with `Idempotency-Key` → 200, project id=197 `L53 Test Board`
- `GET /build/197` → 200: full project record — **real data** ✓
- `GET /build/197/tickets` → 200: `data=[], total=0` — **empty state** (correct for new board)
- `GET /build` list → 200: `data=[{id:197,...}], total=1` — **real data** ✓

### Filtered List (HR Employees)
- `GET /hr/employees` → 200: returns owner user record — **real data** ✓
- `GET /hr/employees?search=test` → 200: filters correctly — **real data** ✓
- `GET /hr/employees?status=ACTIVE` → **400 VALIDATION_FAILED** (see DEFECT-1)

### Settings
- `GET /organization/settings` → 200: full org config (timezone=Asia/Kolkata, region=primary, currency=INR) — **real data** ✓
- `GET /roles` → 200: system roles seeded (ACCOUNTING_MODULE_ADMIN, etc.) — **real data** ✓
- `GET /billing/entitlements` → 200: `tier=PAID, plan=STARTER, seatLimit=10` — **real data** ✓

---

## Backend Log Findings

- No `42501` (RLS no-tenant-context) errors on any authenticated request
- No `permission denied` errors
- Pre-existing errors: background sweep workers fail for legacy orgs with `no region` — unrelated to test flows
- `db.query.execute` spans with `status:error` exist but have no `http.route` tag — these are background sweep failures, not request handlers

---

## Performance (browser driver, localhost loopback)

| Page | p95-TTFB | p75-FCP | PRD Target | Verdict |
|---|---|---|---|---|
| `/` (→ /signin redirect) | 26.8ms | 172ms | 150ms / 1000ms | **MET** |
| `/signin` (3 samples) | 14.8ms | 110ms | 150ms / 1000ms | **MET** |
| `/signin` (5 samples, warm) | 13.9ms | 64ms | 150ms / 1000ms | **MET** |

Caveat: loopback only, no network cost. Floor bound, not comparable to PRD reference geography.

---

## Accessibility (signin page, static analysis)

| Check | Result |
|---|---|
| `<html lang="en">` | PRESENT |
| `<meta name="viewport">` | PRESENT |
| Skip-to-content link | PRESENT |
| `aria-label` | PRESENT |
| `focus-visible` utilities | PRESENT (Tailwind `focus-visible:` classes) |
| `role=` attributes | NOT in initial HTML (client JS adds them) |
| Responsive classes in HTML | 8 `sm:/md:/lg:` references in initial HTML |
| `prefers-reduced-motion` | PARTIAL — `globals.css` targets 3 named CSS animation classes only; no global reset; Framer Motion not globally suppressed by CSS |

---

## DEFECTS FOUND

### DEFECT-1: GET /hr/employees?status=ACTIVE → 400
- **Request:** `GET /hr/employees?status=ACTIVE`
- **Response:** `400 {"code":"VALIDATION_FAILED","details":[{"path":"body","message":"Unrecognized key: \"status\""}]}`
- **Impact:** If the HR employees list page passes `status` as a query param (common filter pattern), the endpoint rejects it. The page would render an error state or empty list rather than the filtered results.
- **No 42501** — clean Zod validation rejection.

### DEFECT-2: Backend dist stale at boot — production deploy risk
- **Evidence:** `dist/modules/finance/ar/finance-ar.module.js` missing `OutboxModule` import. Backend threw `UnknownDependenciesException` for `ReminderOutboxConsumer`.
- **Impact:** Any deployment relying on a cached dist from before `OutboxModule` was wired to `FinanceArModule` will fail to start entirely. Requires `nest build` to be run after that commit.
- **Mitigation applied:** Rebuilt with `nest build --builder swc` for this session.

### DEFECT-3: prefers-reduced-motion not global
- **Evidence:** `globals.css` applies `animation: none` only to 3 specific CSS classes. Framer Motion translate/scale/opacity animations are not suppressed at the CSS layer.
- **Impact:** WCAG 2.2 AA §2.3.3 (Animation from Interactions) — users with `prefers-reduced-motion: reduce` will see Framer Motion animations unless each component individually implements `useReducedMotion()`.
- **Cannot confirm component-level compliance** — requires authenticated browser session.

---

## COULD NOT OBSERVE

1. **Authenticated page rendering in browser** — browser driver uses headless Chrome with no session cookie injection. All authenticated routes redirect to `/signin`. Responsive layout at 375/768/1280, keyboard tab order, focus ring visibility, and actual rendered data for Home/Calendar/Chat/Build/Settings cannot be directly observed.
2. **Chat real-time (Ably)** — WebSocket channel subscription not exercised.
3. **Framer Motion useReducedMotion per-component** — requires authenticated browser session.
4. **Table→card mobileCard transformation at 375px** — requires authenticated browser session.
5. **Filter Drawer collapse at <md** — requires authenticated browser session.
6. **Cross-tenant write isolation** — only owner-tenant reads and one write (POST /build) were tested. Cross-tenant probe not performed.
7. **POST-commit hooks for notifications** — async, not observable via HTTP response.

---

## OUT-OF-OWNERSHIP

- DEFECT-1 (`/hr/employees?status=ACTIVE` → 400): fix is in `backend/src/modules/hr/employees/*.ts` — the query schema should accept a `status` query param, not reject it as an unrecognized key.
- DEFECT-3 (prefers-reduced-motion): if Framer Motion components don't already call `useReducedMotion()`, each animated component in `frontend/` needs it — no single file.
