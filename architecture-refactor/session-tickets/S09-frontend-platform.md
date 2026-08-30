# S09 — Frontend Platform: routes, navigation, shared UI, accessibility

Read `COMMON.md` first — especially §0 (ask once, then run to completion) and §0a (typecheck/build only at the end). Covers PRD §8, §19 and §28.4's frontend half.

## Mission

Every authenticated route is a Server Component that resolves to exact access before it renders, one registry drives every navigation surface, and every page handles all six states responsively and accessibly.

## Exclusive file ownership

```
frontend/app/**                        (every route, layout, page, loading, error file)
frontend/lib/rbac/route-access/**      frontend/lib/rbac/*.ts
frontend/lib/navigation/**             frontend/components/layout/**
frontend/components/ui/**              frontend/components/shared/**
frontend/components/illustrations/**   frontend/components/auth/**
frontend/lib/format-utils.ts           frontend/lib/date-utils.ts
frontend/lib/design-tokens/**          frontend/lib/motion-variants.ts
frontend/lib/query-keys.ts             frontend/lib/query-scope.ts
frontend/lib/api-client.ts             frontend/app/globals.css
frontend/proxy.ts
```

NOT yours: `frontend/features/**` and `frontend/hooks/api/**` (domain sessions S02–S07) · `frontend/lib/rbac/permissions/**` (S01) · all of `backend/**`.

If a route needs a permission key that does not exist, report it to S01 — never add it yourself; a frontend-only key makes `useCan` false forever.

## Already done — confirm, do not redo

- **Universal-route matching is now fail-closed.** `UNIVERSAL_EXCLUSIONS` was removed entirely and replaced with an allowlist: `UniversalRoute` uses `subtree?: boolean` and `universalDescendants?: UniversalDescendant[]` instead of blanket prefix matching. Unknown descendants fail closed to their module/permission requirement.
- `/directory` was demoted from `subtree: true` to exact-only, so `/directory/workers` is no longer universally matched and resolves to `directory:workers:view`. `/directory/{personId}` resolves to `directory:people:view`, which **is** a MEMBER default (`role-defaults.ts:63`, inside `EMPLOYEE_SELF_SERVICE`) — so the people-directory product guarantee still holds. Do not "fix" this back.
- 13 protected descendants are declared; 6 layouts gained server-side enforcement (`notifications`, `knowledge`, `knowledge/wiki`, `mail`, `inventory`, `portal`).
- A 57-row `universal-route-matrix` test exists alongside `no-legacy-role-gates`, `route-access-keys`, `route-access-coverage` and `page-level-gates`. 32/32 pass.
- `hr/layout.tsx`, `build/layout.tsx`, `settings/layout.tsx`, `payroll/layout.tsx`, `billing/layout.tsx` and `support/layout.tsx` already call `enforceRouteAccess`.
- The two `app/(authenticated)/workflows/**` route files were migrated to the workflow cursor contract.

## Work items

### 1. Complete route enforcement
- [ ] List every layout under `app/(authenticated)` and classify: already-enforced · needs-enforcement · intentionally-universal. Put the table in your report.
- [ ] Apply `enforceRouteAccess` to every authenticated layout still doing only a session or module check. A navigation-only layout or a client-only `RequireModule` is insufficient — deep links render and sensitive queries fire before controls are hidden.
- [ ] Add route-gate tests for **every** protected descendant, not a representative sample.
- [ ] Unknown routes fail closed.

### 2. Server-first routes (§19)
- [ ] Route files are Server Components by default; client code stays at interactive leaves. **342 of 598 route pages were client components** — classify and reduce. `pnpm check:client-pages` is the gate.
- [ ] Remove unnecessary page-level `use client`.
- [ ] Add loading and error boundaries for high-traffic routes.
- [ ] **Server prefetch trap:** a query-key factory that does not scope-prefix produces a hydrated entry the client can never read — five factories once made every authenticated route render a spinner. `check:query-scope` guards it; keep it green.
- [ ] `proxy.ts` is the routing layer (`middleware.ts` is deprecated in Next 16 and was deleted — never recreate it). It must never redirect on JWT claims; `resolveWizardGate` is the single wizard-gate authority, or you get `ERR_TOO_MANY_REDIRECTS` the moment the two disagree.
- [ ] **Middleware is not authorization** (CVE-2025-29927) — re-verify at the data layer.

### 3. One navigation registry
- [ ] Desktop sidebar, mobile drawer, mobile bottom nav, product switcher and command palette all consume the same filtered navigation model — never parallel hard-coded lists.
- [ ] Every non-universal route carries a `requiredPermission`; every universal one does not. `sidebar-permission-coverage.test.ts` fails on either.
- [ ] A module surface must not be gated on a **global** `settings:*` key — that makes it invisible to the module's own owner.
- [ ] Never render a link that predictably ends at Access Denied. An inaccessible parent may promote an accessible child, never expose itself.
- [ ] Home holds universal work only: dashboard/communication, `For Me`, announcements, people directory. Recruitment, interviews, employee administration, policies, payroll runs and accounting stay in their owning product nav.

### 4. Route ownership cleanup (product contract)
- [ ] Global administration is `/settings/*`; module configuration is `/<module>/settings/*`. Module-owned surfaces (custom fields, automations, integrations, data-hub import/export) live in each module's settings, never global `/settings/*`.
- [ ] Platform billing is exactly `/settings/billing` and `/settings/billing/ai-credits`. `/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` are deleted — never resurrect them. `/billing/invoices` stays (Accounting's customer invoicing).
- [ ] `/calendar` is the one unified calendar — never module-specific calendar pages.
- [ ] `/projects` redirects to `/build`.
- [ ] When a page moves to its canonical route, **delete the old route files — no legacy redirects** — and update every link.
- [ ] Delete duplicate/legacy Settings routes reported by S01, but only after navigation, command palette, tests and external links have migrated.

### 5. Oversized route files
- [ ] Split by responsibility: `app/(authenticated)/workflows/page.tsx` (543), `app/(authenticated)/accounting/budgets/[budgetId]/page.tsx` (526), `app/(auth)/invitation/[token]/page.tsx` (522), `app/employee-onboarding/page.tsx` (504). Inventory pages (634, 550, 515) belong to an excluded domain — leave their behaviour alone; a pure file split is still permitted but is not required.
- [ ] **Pages compose; they do not implement.** A route `page.tsx` fetches and composes; UI lives in `features/<feature>/components/`. Extract the moment a block owns state, repeats, or passes ~200 lines. If the extraction target is a `features/**` folder another session owns, put the component in `components/shared/` instead, or report it.
- [ ] `components/layout/header/product-switcher-menu.tsx` (562) — split.

### 6. Shared seams
- [ ] Consolidate the **19 local formatters** onto `lib/format-utils.ts`. Money renders in the organization's currency via `useOrgDisplay()`; dates go through `lib/date-utils.ts` + `date-fns`, never inline `toLocaleDateString`.
- [ ] Replace the **4 `useEffect`-driven public reads** with Query hooks. `useEffect` never triggers an API call.
- [ ] Review/migrate the **26 hand-written empty states** onto `EmptyState`.
- [ ] Replace any raw `fetch` with the typed API/download/event clients, with abort handling and consistent error parsing. Every error string goes through `getErrorMessage`.
- [ ] Scope browser storage keys by organization and user where preferences are tenant-sensitive (`lib/org-scoped-storage.ts`); pure UI preferences deliberately do not.
- [ ] Confirm or remove the reported **4 unused files, 49 unused exports and 21 unused exported types** — with module-graph proof plus a real `next build`, never grep alone. One known finding: `lib/observability/error-reporter.ts:getSessionContext` has no static consumer but may be runtime-only telemetry — verify before removing.

### 7. States, responsiveness, accessibility
- [ ] Every page handles loading · refresh · error · denied · empty · **filtered-empty** (filter-empty ≠ data-empty).
- [ ] Loading is a skeleton mirroring the real layout, never a bare spinner; `Loader2` is button-only.
- [ ] Responsive proof at **375 / 768 / 1280**. Below `md`, filter and menu panels become Drawers.
- [ ] WCAG 2.2 AA: keyboard order, focus, labels, contrast, reduced motion. `aria-label` on every icon-only control — `check:icon-labels` is the gate.
- [ ] Public pages have unique metadata, canonical URL, robots policy and structured data where applicable, with zero authenticated content reaching crawlers.

### 8. Frontend lint — scoped, not global
- [ ] A full `eslint` run takes 25+ minutes and gets killed. Scope by the rule's selector and batch **≤60 paths** (356 paths exits 1 with no report). `warn`-level rules never gate. Run the rules that matter (`streamline/no-unlabelled-icon-button`, unused imports) in batches.

### 9. Hook gating gaps reported by other sessions
- [ ] `frontend/hooks/api/ai-credits.ts` — `useAiCreditsWallet`, `useAiCreditTransactions` and `useAiCreditsUsage` lack `enabled: useCan("billing:ai-credits:view")` and fire 403s for unpermitted roles. This file sits outside every domain session's ownership, so it is yours. Verify the key exists in both catalogs before using it.

## Validation (run once, at the end)

`pnpm type-check` · `pnpm build` · `check:cycles` · `check:routes` · `check:route-access-contract` · `check:route-access-contract:self-test` · `check:client-pages` · `check:query-scope` · `check:formatters` · `check:empty-states` · `check:effect-fetches` · `check:icon-labels` · `check:dead-code` · `check:module-manifest` · `check:contract-vendor` · `verify:server-data-seam` · jest (full frontend suite).

**The frontend tsconfig EXCLUDES test files** — a clean `type-check` does not prove your tests compile. Run jest. And test caching with `next build && next start`, never `next dev`.

## Definition of done

Every authenticated route resolves to exact universal access or a declared permission and no protected descendant is universal; one registry drives every navigation surface; route files are server-first with client code at the leaves; every page handles all six states at 375/768/1280 and meets WCAG 2.2 AA; formatters, clients and empty states are consolidated; zero proved dead code; `next build` succeeds.

Report to `architecture-refactor/session-tickets/reports/S09-report.md`.
