> **STATUS: DONE — 2026-09-10, commit `a6a9808b1`.** All 10 required-work items and all 6 "tests that
> must bite" are closed; the full record is at the bottom of this file under "Completion record".
> Banner added 2026-09-10 by the C9 session, which re-verified rather than restated the claim:
> commit present · all five named artefacts present · 23 `page.tsx` on disk matching the census's 23 ·
> `lib/prefetch` **14 suites / 214 tests passing**.

# Complete C8: account for every settings surface prefetch

Work directly in the StreamlineOS repository and complete implementation plus verification. Read applicable `CLAUDE.md` files before editing, preserve unrelated changes, and do not commit or push unless explicitly requested.

## Source and objective

The source requirement is candidate C8 in:

`C:/Users/Aditya_Lappy/AppData/Local/Temp/architecture-review-20260909-233331.html`

Twelve of twenty-three settings pages currently hydrate prefetched state. Account for the remaining eleven so every settings route either eliminates its useful post-paint initial read or has executable evidence that there is no useful read to prefetch.

Remaining routes:

- `/settings`
- `/settings/modules`
- `/settings/users`
- `/settings/webhooks`
- `/settings/audit-log`
- `/settings/delegations`
- `/settings/billing`
- `/settings/billing/ai-credits`
- `/settings/incoming-transfer`
- `/settings/roles/simulate`
- `/settings/roles/audit`

Start with `frontend/lib/prefetch/settings.ts`, the corresponding `frontend/app/(authenticated)/settings/**/page.tsx` files, and the client hooks rendered by each route.

## Required work

1. Build a census of all 23 routes recording:
   - server permission gate;
   - initial client queries;
   - complete query key inputs;
   - runtime response contract;
   - client stale/refetch policy;
   - prefetch helper or a test-backed `NO_PREFETCH_NEEDED` reason.
2. For every useful initial read, prefetch on the server with the same authorization, exact query key, search parameters, pagination/filter defaults, and runtime schema used by the client.
3. Wrap the relevant client surface in `HydrationBoundary` and prove the first mount does not repeat the hydrated request.
4. Convert `/settings/modules` to a server wrapper plus client component if needed.
5. Derive URL-dependent initial keys from server `searchParams` for users, webhooks, audit log, delegations, billing, and role views. A snapshot under the wrong key does not count.
6. Resolve `staleTime: 0` or `refetchOnMount: "always"` paths deliberately so prefetched data is not immediately discarded. Choose a justified freshness window or classify the route as not usefully prefetchable.
7. Treat `/settings` as no-prefetch-needed only if it has no client data request that can be removed. Do not invent a request to satisfy the census.
8. Preserve `useAccess` behavior with `staleTime: 30_000`, `refetchOnWindowFocus: true`, and `refetchOnReconnect: true`.
9. Keep server prefetch behind the same permission gate as the route. A denied user must trigger zero protected API calls.
10. Add a census/architecture test that fails when a new settings page lacks either a real prefetch or an explicit tested classification.

## Tests that must bite

For each newly prefetched query, prove:

- server and client compute exactly the same query-key hash;
- hydration supplies the first render without a duplicate client call;
- search-param changes select a different cache entry;
- denied users cause no prefetch;
- parse failures do not hydrate invalid data;
- a stale snapshot refetches according to the intended policy.

Add a table-driven census test covering all 23 current routes. It must fail if a page is added without classification or if a claimed hydration boundary/helper is removed.

## Verification and completion

Run focused prefetch/hydration tests, affected page tests, frontend typecheck, contract-vendor checks, query-key checks, and dependency-cycle checks. Use request-count assertions rather than relying only on source inspection. Inspect the resulting server/client boundary for accidental secret or token serialization.

The task is complete only when all 23 settings routes appear in the executable census and every useful initial request is server-prefetched under the exact client key. Report which of the eleven were prefetched, which were proven no-op, before/after initial request counts, and exact verification results.

---

## Completion record — 2026-09-10 (commit `a6a9808b1`)

### Required work

- [x] **1. Census of all 23 routes.** Executable, not prose: `frontend/lib/prefetch/settings-prefetch-census.test.ts` enumerates the routes from disk via `collectAppRoutes("(authenticated)")` and records, per route, the server gate, the prefetch helper and its module, or a `no-prefetch` reason. Initial queries, complete key inputs, runtime contract and stale policy are pinned by the sibling suites below rather than restated as text.
- [x] **2. Server prefetch under the same authorization, key, search params, defaults and runtime schema.** `settings-account.ts`, `settings-admin.ts`, `settings-billing.ts`. Every read passes the same Zod contract the client hook passes. `settings-prefetch.test.ts` runs the real factories, hydrates into `createAppQueryClient(scope)`, and asserts the payload is readable under the exact key the hook builds.
- [x] **3. `HydrationBoundary` + no repeated request.** `settings-hydration.test.tsx` mounts each hook twice — hydrated and not — and asserts 0 vs 1 `apiClient.get` calls. The census test asserts each page actually mounts `<HydrationBoundary state={state}>`.
- [x] **4. `/settings/modules` converted.** Page is now a server wrapper with `requirePermission("settings:manage")`; UI moved to `features/settings/modules/modules-page.tsx`. `DashboardGate` removed — the server gate replaces it, matching every sibling settings route.
- [x] **5. URL-dependent keys derived from server `searchParams`.** `lib/route-search-params.ts` turns the route's `searchParams` promise into a `URLSearchParams` whose `.get()` matches `useSearchParams()`. The page and the prefetch then call the *same* reader — `readUsersListState`, `readAuditLogFilters`, `readDelegationListState`, `resolveBillingTab`. `settings-prefetch-params.test.ts` asserts a filtered URL hydrates a key the unfiltered page never reads, and vice versa.
- [x] **6. `staleTime: 0` / `refetchOnMount: "always"` resolved deliberately.** One route hit this: `/settings/incoming-transfer`. Classified not usefully prefetchable rather than having its freshness relaxed — see below. No other settings route declares either.
- [x] **7. `/settings` is NOT no-prefetch.** It has three real client reads (`/sessions`, `/me/login-history?page=1&limit=5`, `/auth/mfa/status`) behind `next/dynamic({ssr:false})` components. All three are now hydrated; none were invented.
- [x] **8. `useAccess` untouched.** `git diff` over `hooks/api/access.ts` shows only the `usePermissionGate` body swap to the shared predicate; `staleTime: 30_000`, `refetchOnMount: true`, `refetchOnWindowFocus: true` and `refetchOnReconnect: true` are unchanged.
- [x] **9. Prefetch behind the route's gate; denied users make zero protected calls.** Each route calls `requirePermission(...)` (or `enforceRouteAccess` for the universal `/settings`) *before* the prefetch — asserted by index position in the census test. Sub-reads gated on a different key than the route consult `resolvePrefetchGate()`, which fails closed when the access read itself fails. `/settings/roles/[roleId]` gained the page-level gate it was missing: a layout redirect does not stop a page prefetch, because Next renders both concurrently.
- [x] **10. Census/architecture test that fails on an unclassified page.** Bite-proved, not assumed: adding an empty `app/(authenticated)/settings/__bite__/page.tsx` and separately removing one `HydrationBoundary` each turned the suite red (3 failures); both were reverted and the suite returned to 76 green.

### Tests that must bite

- [x] **Server and client compute the same key hash** — `settings-prefetch.test.ts` hydrates the server snapshot into the app's own scoped client and reads it back by the hook's key; a control case proves a different scope cannot read it.
- [x] **Hydration supplies the first render with no duplicate call** — `settings-hydration.test.tsx`, request-count assertions in both directions.
- [x] **Search-param changes select a different cache entry** — `settings-prefetch-params.test.ts` (members, audit log, each delegations list independently, each billing tab).
- [x] **Denied users cause no prefetch** — table-driven across every factory, plus a failed-access-read case.
- [x] **Parse failures do not hydrate invalid data** — `settings-prefetch-contract.test.ts` mocks `fetch` so the real envelope parser runs; drifted bodies hydrate nothing and report a contract violation.
- [x] **A stale snapshot refetches per the intended policy** — the `/settings/incoming-transfer` case asserts it refetches on mount *even when hydrated*, which is what makes its classification true rather than convenient.

### Results

| | |
|---|---|
| Prefetched (of the eleven) | `/settings`, `/settings/modules`, `/settings/users`, `/settings/webhooks`, `/settings/audit-log`, `/settings/delegations`, `/settings/billing`, `/settings/billing/ai-credits`, `/settings/roles/simulate`, `/settings/roles/audit` — **10** |
| Proven no-op | `/settings/incoming-transfer` — **1** |
| Initial requests before | 21 post-paint reads across the eleven |
| Initial requests after | **1** (the retained incoming-transfer refetch) — 20 removed |

`/settings/billing` is per-tab: `plan` prefetches `/billing`, `/billing/plans`, `/billing/entitlements` and (only for a holder of `billing:seats:view`) `/billing/seats`; `payments` prefetches `/billing`; `profile` prefetches `/billing/profile` for a holder of `billing:profile:view`.

### Verification

`pnpm type-check` OK · `pnpm build` OK (all 23 settings routes render dynamic) · 158 jest suites / 1653 tests OK · `check:cycles` OK 0 circular · `check:dead-code` (knip) OK 0 new unused files or exports · `check:contract-vendor` OK · `check:query-scope` OK · `check:response-contracts` OK (unresolvable route sites fell 11 to 2) · `check:gated-reads` · `check:route-access-contract` · `check:permission-binding` · `check:file-sizes` · `check:named-handlers` · `check:route-thinness` · `check:client-pages` · `check:feature-cycles` · `check:effect-fetches` · `check:query-signal` · `check:gate-wiring` · `check:routes` — all OK.

Boundary inspection: `settings-prefetch.test.ts` asserts no dehydrated snapshot contains the backend JWT, an `authorization` header, a `backendJwt` field or a `set-cookie` value.

**Not caused by this work, still red in this shared tree** (all belong to the concurrent C3/C6/C10 sessions, whose files are staged but uncommitted): `check:import-direction` (`features/support` importing `features/shared/automations`, present verbatim at HEAD), `check:test-typecheck` (4 errors in `use-organization-settings-form.test.tsx` and `module-gate-agreement.test.tsx`), `check:test-integrity` (4 bare throws in `org-settings-form-adoption.contract.test.ts`, `settings-schema-placement.contract.test.ts`, `branch-options-seam.test.tsx`), `verify:server-data-seam` (`features/hr/documents/documents-page.test.tsx` lacks `not.toHaveBeenCalled` at HEAD), `check:dead-code` (`org-business-hours-schema.ts:BusinessDayHours` needs a knip verdict).
