# Unified Page State — design

> Status: awaiting review · 2026-09-16
> Scope: Home · HRMS · Documents (~170 routes) + the shared primitives, the route error boundary, sidebar locking, and the backend module-denial contract.

## 1. The defect

A 402 `MODULE_NOT_ENABLED` renders **"Project error — Failed to load project. Please try again."** with a retry button that can never succeed.

Chain, verified in source:

1. `backend/src/common/rbac/module.guard.ts:37` throws `ModuleDisabledException`, status 402.
2. `frontend/lib/query-error-policy.ts:22` — `readErrorReachesBoundary` returns `true` for any status it does not name, so 402 escapes the query.
3. Next routes it to `app/(authenticated)/build/[projectId]/error.tsx:12`.
4. `components/ui/route-error-boundary.tsx:76` classifies only *transient network* vs *everything else*, so it renders the generic card.

A plain 403 takes the same path: unless it carries `ORG_MEMBERSHIP_INACTIVE`/`SUSPENDED`, a permission denial also reads "Something went wrong".

This class is already on record. Commit `03c54dfa9` found it on the org-setup wizard — *"the inline branch existed and was unreachable"* — and fixed it one hook at a time with `INLINE_READ_ERROR`. Per-hook patching is why it recurs.

### The message is also wrong

`common/rbac/module-availability.ts:1` resolves three distinct causes:

```ts
export type ModuleAvailabilityReason = "not-in-plan" | "org-disabled" | "user-denied";
```

`module.guard.ts:36-37` discards it, and `common/http/api-exceptions.ts:32` hardcodes one plan-flavoured string for all three. Grep confirms `.reason` has **no read site outside `module-availability.ts`** — it is write-only.

Applied to the captured screenshot: `feedbucket` is `planGated: true`, but `PLAN_LOCKED_MODULES.FREE` is exactly `["payroll", "inventory"]`. The resolver classified that request `org-disabled` and the user was told to upgrade. The remedy was an admin toggle. Only `payroll` and `inventory` on FREE can legitimately produce a plan message through this path.

## 2. Current state

| | Home | HRMS | Documents |
|---|---|---|---|
| Routes | ~23 | ~127 (94 in nav, 33 unlisted) | 20 |
| `plan-required` UI | none | none | none |
| `module-not-enabled` UI | 1 page | 0 | 15 (`RequireModule`) |
| `NoPermissionState` | 5 pages | 0 | 0 |

Repo-wide: 499 of 610 pages (82%) use none of `ErrorState` / `LoadingState` / `NoPermissionState`.

Three mechanisms solve the same problem three ways:

- **HRMS** — server redirect to `/access-denied`, a route *outside* `(authenticated)`, so the shell is lost and `module:hr` is shown to the user as a raw permission chip.
- **Documents** — `RequireModule` in-page; returns `null` while access loads, has no plan branch.
- **Home** — mostly nothing.

`plan-required` does not exist anywhere in the repository.

### Three partial solutions already exist, unwired

| Component | Covers | Consumers | Gap |
|---|---|---|---|
| `Gated` (`components/shared/gated.tsx:45`) | loading · denied · error · empty | 8 | no module, no plan |
| `EntitlementGate` (`components/entitlement-gate.tsx:348`) | 402 quota/feature/module, 403 | 1 | error-driven; cannot gate before a request; unknown 402 codes fall through to `children` (`:418`) |
| `RequireModule` (`components/auth/require-module.tsx:37`) | module disabled | ~15 | `null` while loading; no plan branch |

Two live inconsistencies:

- `useModuleEnabled` (`hooks/api/access.ts:130`) fails **open** while loading; the sidebar's `isModuleEnabled` (`sidebar-products.ts:197`) fails **closed**. Page and nav disagree for the duration of the access fetch.
- `useEntitlements` is `retry: false, throwOnError: false`, so `lockedModules` defaults to `[]` — a failed billing read currently means "nothing is locked".

## 3. Decisions

| # | Decision |
|---|---|
| D1 | Denial renders **in-page**, inside the shell. Sidebar, header and title stay; `actions` and `filters` are suppressed. |
| D2 | `/access-denied` moves inside the authenticated shell and renders the same component, as the direct-URL fallback. |
| D3 | Sidebar **hides** on missing permission; **renders locked with an upgrade link** on plan. |
| D4 | The backend carries `reason` + `upgradePath` on the wire. No client-side reconstruction. |
| D5 | Missing backend module/plan guards are added, each reported individually. |
| D6 | Sequenced: foundation → 6 proof pages → review → Documents → Home → HRMS. |

## 4. Architecture

Four layers, one state machine.

```
resolvePageState()            pure, no JSX, unit-tested
      │
      ├── <PageState>         renderer, standalone
      ├── PageWrapper state=  page composition (extends the existing shell)
      └── RouteErrorBoundary  last line: server throws and deep links
```

### 4.1 Classifier — `lib/page-state/resolve-page-state.ts`

Extends the existing `resolveGate` (`lib/rbac/gate.ts:51`) rather than replacing it, so the branch-order bug it already fixed stays fixed.

```ts
export type PageStateResolution =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "empty" }
  | { kind: "denied"; permission: PermissionKey }
  | { kind: "module-disabled"; moduleKey: string }
  | { kind: "module-denied"; moduleKey: string }
  | { kind: "plan-required"; moduleKey: string; upgradePath: string }
  | { kind: "quota-exceeded"; limitKey: string; used: number; limit: number; upgradePath: string }
  | { kind: "feature-locked"; feature: string; requiredPlan: string; upgradePath: string }
  | { kind: "error"; error: unknown };
```

Precedence, and why:

1. **access loading** — nothing below can be decided yet.
2. **module unavailable** → `module-disabled` · `module-denied` · `plan-required`.
3. **permission denied** → `denied`.
4. **data loading**.
5. **request error** — 402 `code` + `details.reason` map onto kinds 2/`quota-exceeded`/`feature-locked`; 403 maps to `denied`; anything else is `error`.
6. **empty**.
7. **ready**.

Module precedes permission because `ModuleGuard` is a global `APP_GUARD` (`app.module.ts:247`) and runs before the controller-scoped `PermissionGuard`. The client must predict what the server would answer; inverting the order makes it lie.

`isTransientNetworkError` stays inside the `error` branch rather than becoming a kind — the renderer already varies on it and auto-retries.

`details` arrives as `unknown`. It is parsed by a Zod schema in `lib/page-state/page-state-schema.ts` at that boundary, per frontend/CLAUDE.md §6; a malformed `details` degrades to `module-disabled`, never throws.

### 4.2 Renderer — `components/shared/page-state.tsx`

Reuses `ErrorState`, `EmptyState`, `NoPermissionState`, and **promotes the three states already written and private inside `entitlement-gate.tsx`**: `ModuleNotEnabledState:230`, `FeatureUnavailableState`, `QuotaExceededState:379`. One new state is drawn: `plan-required`. Nothing else is invented.

Copy differs per kind because the remedy differs, which is the whole point of D4:

| Kind | Says | Action |
|---|---|---|
| `module-disabled` | not enabled for this organisation | admin enables it — `/settings/modules` |
| `module-denied` | you were individually denied this module | ask an admin; **no** enable link, it is already on |
| `plan-required` | needs a paid plan | `/settings/billing` |
| `denied` | you lack the permission | names the key; no link |

```tsx
<PageState resolution={state} loading={<DataTableSkeleton rows={10} columns={6} />}
           empty={<EmptyState … />} onRetry={refetch}>
  {children}
</PageState>
```

### 4.3 Page composition — extend `PageWrapper`, do not add a second shell

`PageWrapper` (`components/ui/page-wrapper.tsx:36`) gains `state?` · `loading?` · `empty?` · `onRetry?`.

- `state` absent → **behaviour is byte-identical to today**. This is the guarantee that the other 440 pages outside this rollout cannot break.
- `state` present and not `ready` → the content zone renders `<PageState>`; `actions` and `filters` are suppressed; `title` and `subtitle` stay.

Adding a `PageShell` beside `PageWrapper` would be a second page shell doing one job — a §4 defect. Extending is the compliant move, and it keeps §15's "one page shell" row true.

`<PageState>` remains usable standalone for tabs, panels and dialogs that are not whole pages.

### 4.4 Route error boundary

`RouteErrorBoundary` (`components/ui/route-error-boundary.tsx:66`) routes through the same classifier, so a 402 thrown from a server component renders the correct state instead of "Project error".

`readErrorReachesBoundary` (`lib/query-error-policy.ts:8`) stops sending **402 and 403** to the boundary at all — both now have in-page states. The 199 `error.tsx` files keep their current call signature; only the shared component beneath them changes.

## 5. Consolidation

Cardinal Rule §4 — two symbols doing one job must become one.

| Symbol | Action |
|---|---|
| `Gated` | 8 consumers migrated, then **deleted** |
| `EntitlementGate` | 1 consumer (`features/billing/components/plan-tab.tsx:422`) migrated, then **deleted** |
| `RequireModule` | **Name and call signature kept** — zero churn at ~15 Documents call sites — reimplemented on the classifier, gaining the loading and plan branches |
| `AccessDenied` (`components/shared/access-denied.tsx:15`) | **Out of scope.** Role-based, not permission-based; 2 consumers. Flagged, not touched. |
| `EmptyState.access` (`empty-state.tsx:52`) | Retained; it already delegates to `NoPermissionState` and does not conflict |

## 6. Backend

### 6.1 Carry the reason (D4)

`common/http/api-exceptions.ts:27`:

```ts
export class ModuleDisabledException extends HttpException {
  constructor(moduleKey: string, reason: ModuleAvailabilityReason, upgradePath: string | null) {
    super(
      { code: "MODULE_NOT_ENABLED", message: messageFor(moduleKey, reason),
        details: { moduleKey, reason, upgradePath } },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
```

Three throw sites: `module.guard.ts:37`, `permission.guard.ts:58`, `crm-mcp.service.ts:163`.

`permission.guard.ts:58` does not currently hold the reason — `authorize.ts:62` collapses it into `NO_MODULE`. The deny result gains an optional `moduleReason` field rather than widening `DenyReason` (`access.types.ts:21`), keeping the blast radius to the one branch that sets it.

`upgradePath` is `/settings/billing` only for `not-in-plan`, and `null` otherwise — so the UI can never offer to sell a fix for a problem money does not solve. This also closes the gap where `MODULE_NOT_ENABLED` was the only one of the five 402 codes carrying no `upgradePath`.

### 6.2 Guard audit (D5)

Every endpoint behind the three modules is checked for a module/plan guard. Each added guard is reported with its route, the module asserted, and why. Endpoints that are correctly ungated (universal self-service, KB reads) are listed as deliberate.

**Not touched:** `entitlements.service.ts:206` returns 403 for *enabling* a plan-locked module while *using* one returns 402. Real inconsistency, separate surface, out of this scope — recorded here so it is not lost.

## 7. Sidebar (D3)

`lockedModules` threads from `useEntitlements` into `getNavGroupsForUser` / `getNavGroupsForProduct` / `filterRoute` (`components/layout/sidebar/sidebar-nav-items.ts:143-208`).

- Missing permission → entry removed (today's behaviour, unchanged).
- Plan-locked → entry kept, marked `locked`, rendered with a lock affordance, href retargeted to `/settings/billing`.

All five consumers already read the same filter functions, so no parallel list is introduced. The existing product-switcher treatment (`product-grid.tsx:15-18`) hard-codes `{ payroll, inventory }`; that map is replaced by the threaded `lockedModules` so there is one source.

**Failure mode is deliberate:** a failed entitlements read leaves `lockedModules` empty and the entry renders unlocked. Navigation is not an authorization boundary — the server still answers 402 and the page renders `plan-required`. Hiding navigation on a transient billing-read failure would be the worse bug.

Test impact: `sidebar-permission-coverage.test.ts` asserts nothing about `module`, so it is unaffected. `nav-surface-parity.test.ts` requires sidebar ⊆ command palette; locked entries appear in both.

## 8. The universal no-gate zone

Root §8: employee self-service and knowledge are platform core, **never paid entitlements**.

`/me/pay` reads payroll. `/knowledge/*` is the `kb` module. Gating a page on its module because the module exists would put an upgrade wall in front of an employee's own payslip — a privilege regression.

`lib/rbac/route-access/universal-routes.ts:16-129` is the authority and is treated as a hard no-gate list: `/dashboard`, `/home`, `/me/*`, `/mail`, `/inbox`, `/chat`, `/notifications`, `/calendar`, `/announcements`, `/hr/announcements`, `/directory`, `/kb`, `/docs`, `/knowledge/*`, `/support/my`, `/referrals`, `/jobs`, `/settings` (exact), `/access-denied`, `/access-suspended`.

`/hr/announcements` is on that list despite its URL — it is a Home route wearing an HR path (`sidebar-home-nav.ts:89`), asserted by `route-access-coverage.test.ts:108`.

No page in this zone receives a module, plan or permission gate. Where one already reads a plan-gated module's data, the *data* degrades; the *page* does not gate.

## 9. Rollout (D6)

| Phase | Content | Gate |
|---|---|---|
| 1 | classifier · renderer · `PageWrapper` props · error boundary · backend reason · sidebar locking | typecheck both repos · targeted jest |
| 2 | 6 proof pages, incl. the feedbucket 402 | **user review** |
| 3 | Documents (20) | typecheck · build |
| 4 | Home (23) | typecheck · build |
| 5 | HRMS (127) | typecheck · build |

Fan-out rules for 3–5: read-only audit agents propose, the coordinator applies; no two agents in one file; shared files (`page-wrapper.tsx`, `sidebar-nav-items.ts`, the classifier) are coordinator-owned throughout.

## 10. Verification

- `pnpm typecheck` both repos — backend needs `NODE_OPTIONS=--max-old-space-size=10240`; at 8192 it dies exit 134 printing no errors.
- `next build` — the only proof for bundling and the route-error-boundary wiring.
- Targeted jest: new classifier unit tests · `route-error-boundary.test.tsx` · `sidebar-permission-coverage.test.ts` · `nav-surface-parity.test.ts` · `catalog-sync.test.ts` · backend `module.guard` and `permission.guard` specs.
- Browser proof on the captured 402, against a booted stack. A passing typecheck is not proof a customer journey works.

Pre-existing failures are separated from new ones by confirming on a clean tree first.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Gating a universal self-service page | §8 allowlist is a hard no-gate zone; asserted by the existing coverage tests |
| 170-page rollout regresses a working screen | `state` prop is opt-in; absent → identical behaviour. Phase gate after 6 proof pages |
| 403 no longer reaching the boundary changes behaviour | Intended; `03c54dfa9` already recorded boundary-403 as a defect |
| Backend guard 402s a screen that works today | Each guard reported individually with justification before it ships |
| Entitlements read fails | Fails open by design; server remains the boundary (§7) |
| `useModuleEnabled` fails open, sidebar fails closed | Classifier resolves the loading window explicitly as `loading`, never as available |

## 12. Out of scope, recorded

- `/knowledge` has **no `page.tsx`** despite `module-manifest.json:214` declaring it the module route. Any hit on the bare manifest route 404s.
- `entitlements.service.ts:206` 403-vs-402 inconsistency (§6.2).
- `AccessDenied` role-based component (§5).
- 33 HRMS routes reachable but absent from the nav model; they inherit gates by prefix.
- `features/wiki`'s in-module sidebar renders Templates, Import, Spaces and Trash unconditionally though all four are server-gated.
