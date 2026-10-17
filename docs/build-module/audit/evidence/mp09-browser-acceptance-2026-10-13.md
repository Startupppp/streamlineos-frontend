# MP-09 Browser Acceptance — 2026-10-13

Status: **incomplete.** Browser verification resumed against the authenticated
production deployment on 2026-10-13. The populated-route responsive matrix is
complete; role, tenant, multi-page and disposable-token fixtures remain absent.

**Examiner:** Aditya Challa  
**Branch:** main  
**Playwright version:** 1.63  
**Browser:** Chromium only

---

## Harness design

The intercepted harness (`playwright-intercepted.config.ts`, port 3201) cannot serve module-gated pages out of the box. `enforceRouteAccess` calls `serverGet("/me/access")` which calls `getServerToken()`, which reads `session.backendJwt`. With `API_INTERNAL_URL=http://localhost:9999` and no listener, the session exchange returns null and `getServerToken()` throws `UNAUTHENTICATED`.

**Solution:** A lightweight Node.js HTTP mock server is started in `test.beforeAll` on port 9999. It handles:

- `POST /auth/session-exchange` → returns a fake base64url JWT
- `GET /auth/session-data/*` → returns 404 (propagates as null; token claims are used)
- `GET /me/access` → returns the full build scopes and modules

**`/me/access` is stubbed, so no cell here proves authorization.** This stub was
the only way to make the intercepted harness serve a module-gated page at all,
but it means every `denied` cell proves how the **UI renders** a denied state and
nothing about whether the server would actually deny. Real authorization is
proven by the MP-11 suite — 118 HTTP tests against a listening server — not here.

The mock server lives in `frontend/e2e/fixtures/mock-backend-9999.ts`. It is started and stopped per spec file. The browser-side API calls (port 1500) continue to be intercepted by Playwright route handlers per the existing calendar-core pattern.

---

## Priority 1 — Mobile overlay non-intersection (375 px)

**Spec:** `frontend/e2e-intercepted/managed-products-mobile-overlay.spec.ts`  
**Result: 7/7 PASSED**

Routes tested at 375 × 812:

| Route | FAB >= 44×44 | More tab >= 44×44 | No intersection | No h-overflow |
|---|---|---|---|---|
| `/build/managed-products` (list) | PASS | PASS | PASS | PASS |
| `/build/managed-products/1001` (overview) | PASS | PASS | PASS | PASS |
| `/build/managed-products/1001/feedback` | PASS | PASS | PASS | PASS |
| `/build/managed-products/1001/projects` | PASS | PASS | PASS | PASS |
| `/build/managed-products/1001/roadmap` | PASS | PASS | PASS | PASS |
| `/build/managed-products/1001/releases` | PASS | PASS | PASS | PASS |
| `/build/managed-products/1001/settings` | PASS | PASS | PASS | PASS |

No defects found.

---

## Priority 2 — State matrix × viewports

**Spec:** `frontend/e2e-intercepted/managed-products-states.spec.ts`  
**Result: 38/38 checks passed across three bounded runs.**

The former 12 failures were harness defects. Common layout endpoints returned
invalid empty objects, strict locators matched hidden responsive duplicates,
the overview assertion expected a product name where the route contract shows
`Product overview`, and full-page load waits were vulnerable to global-widget
traffic. The fixtures now match current response contracts, assertions are
scoped to the main surface, navigation waits for DOM content and retries the
explicit temporary-server state. The Playwright web server uses the direct Next
binary because the local pnpm wrapper reports `unable to open database file`.

Verification was split to avoid losing a long serial development-server run:
25 checks covered every list viewport plus detail routes at 375 and 768 px; 14
checks covered the 1280 list/detail routes plus denied and not-found states; two
checks covered deep-link and refresh. The overlapping 1280 list cells make the
unique total 38. Every unique check passed.

Viewports: 375 × 812, 768 × 1024, 1280 × 800.

States exercised per route:
- `populated` — list/detail data returned and the expected route UI visible
- `empty` — 200 with empty data array, "no managed products yet" status visible
- `error` — 500 from API, "could not load" visible
- `denied` — no scopes in `/me/access` client-side response
- `not-found` — 404 for integer product id; non-integer id tested via route guard

Routes: list, overview, insights, feedback, goals, projects, roadmap, releases, settings.

---

## Priority 3 — Keyboard traversal and focus — GALLERY ONLY, not the real route

**Spec:** `frontend/e2e/managed-products-acceptance.spec.ts`  
**Result: 3/3 gallery tests PASSED** (3 real-backend tests skipped — no tenant env)

These three ran against the dev-only `/design-system` gallery, **not** against an
authenticated Manage Product route. MP-09 explicitly rules the gallery out as a
substitute for browser evidence, so this does not close the keyboard portion of
MP-09. Authenticated keyboard traversal, visible focus, focus trapping and focus
return are **NOT-RUN**, because the real-backend specs skip on
`hasBackendSecrets()` / `hasTenantEnv()` and the local backend never bound to
port 1500 (see the startup investigation below). A skip is not a pass.

| Test | Result |
|---|---|
| Tab order: search → Status → Sort | PASS |
| Enter opens Actions dropdown; Escape closes and returns focus | PASS |
| Search input has visible focus ring | PASS |

---

## Spec files created

- `frontend/e2e-intercepted/managed-products-mobile-overlay.spec.ts`
- `frontend/e2e-intercepted/managed-products-states.spec.ts`
- `frontend/e2e/managed-products-acceptance.spec.ts`
- `frontend/e2e/fixtures/mock-backend-9999.ts`

---

## Backend startup investigation

The NestJS backend in `backend/dist/main.js` was attempted for a real persisted stack. It boots and initializes all modules but fails silently without binding to port 1500. Root causes found during investigation:

1. First run failed: `AI_CONFIRMATION_SECRET is too short for cross-module handoff signing (min 32 chars)` — fixed by adding to env file.
2. Second run: backend starts (all module deps initialized per stdout), then hangs in `onApplicationBootstrap` phase. The `be-ps.log` (960 KB) shows full module initialization completes but the process never calls `app.listen()`. The `RoleGrantReconcilerService.onApplicationBootstrap` with `RBAC_GRANT_RECONCILE_ON_BOOT=false` does not reconcile, but another service in the bootstrap phase is blocking indefinitely.

Fallback: intercepted harness + mock backend at port 9999.

---

## Defects found

None found in the pages themselves. All tested pages render without horizontal overflow at all three viewport widths. FAB and bottom-nav More tab are non-intersecting and meet the 44 × 44 minimum tap target at 375 px.

The `/billing` browser-side endpoint was missing from the mock, producing `ApiContractError: CONTRACT_VIOLATION` in the browser console (not a test failure). Fixed by adding a conforming mock response for `GET /billing`.

---

## IDE browser pass — product 1, signed-in owner

This section is the local app at `http://localhost:1000` against the configured API. It is not the intercepted harness above, and it does not close MP-09.

| Check | Result |
|---|---|
| Reload `/build/managed-products/1/settings?tab=publishing` | Browser verified. Publishing stays selected. The page shows Published, link issued 13 Oct 2026 13:13:19, no expiry. |
| Rotate share link, then Escape | Browser verified. Dialog opens with focus on Cancel. Escape closes it, focus returns to Rotate share link, and the issued time is unchanged. |
| Description save, refresh, clear, refresh | Browser verified. The saved description was present after refresh. Clearing it and saving again left the field empty after a second refresh. Product name stayed testog. |
| Owner publication controls | Rotate and copy new link, Rotate share link, and Unpublish are visible to this owner. |
| Read-only publication controls | Not walked with a second user. The settings section now hides rotate and unpublish unless `build:roadmap:manage` is granted, covered by the publication section test. |

Still not shown in this browser: a restricted member, another tenant, three-page pagination, offline recovery, an expired or rotated or revoked public token, and scroll restoration through `?ret=`. The live public link was left published.

---

## Production browser pass — `https://www.streamlineos.in`

The signed-in owner account has one visible product (`testog`, id 1). The
directory plus all eight product routes were opened in the visible browser at
375, 768 and 1280 px. Every route settled on its expected heading with no
horizontal overflow. The tested routes were directory, overview, feedback,
insights, goals, projects, roadmap, releases and settings.

At 1280 px, Insights produced one transient `Something went wrong` state with
reference `67690d95-554a-4896-af8e-df8c2778db71`. Immediate navigation back to
the same URL loaded normally and browser error/warning logs were empty, so this
is recorded as a recovered transient rather than a reproducible defect.

Overview briefly measured a 520 px document width during the first 375 px pass
before its resize plan settled to 375 px. The local source now applies filter
slot minimum widths only from the `md` breakpoint, preventing that initial
mobile layout expansion. The focused overview suite passed 12 of 12 tests. This
source change is not production verified until the revision is deployed.

The production account cannot prove the remaining matrix: it exposes one
owner/admin, one organization member, one tenant and one product. Three-page
pagination needs at least three pages of disposable records. Expired, rotated
and revoked-token cases require disposable publication data. No production
records or access grants were created during this read-only route pass.

## Delivery checklist

- [x] Pass the intercepted populated, empty, error, denied and not-found state checks.
- [x] Verify every populated production product route at 375, 768 and 1280 px.
- [ ] Verify real restricted, denied and second-tenant actors.
- [ ] Verify three-page paging, offline/recovery, dirty failures and disposable token expiry/rotation/revocation.
