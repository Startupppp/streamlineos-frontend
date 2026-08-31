# L24 — Frontend Lib / Navigation Report

**Status:** DONE

## Navigation surfaces consolidated
VERIFIED DONE — all five surfaces already consume the same filtered navigation model:
- Desktop sidebar (`app-sidebar.tsx`): `getNavGroupsForProduct`
- Mobile drawer (same `AppSidebar` component)
- Mobile bottom nav (`mobile-module-nav-items.ts`): consumes `NavGroup`/`NavRoute` from `sidebar-nav-items`
- Product switcher (`product-switcher-menu.tsx`): `getNavGroupsForProduct`
- Command palette (`command-palette.tsx`): `getNavGroupsForUser`
`nav-surface-parity.test.ts` (4 tests) verifies parity; `sidebar-permission-coverage.test.ts` verifies every non-universal route has a `requiredPermission` and no universal route does.

## Formatters consolidated
VERIFIED DONE — `check:formatters` passes ("No local Intl.NumberFormat formatters found outside lib/format-utils.ts", 4728 files scanned). No work needed.

## Files split
`components/layout/header/product-switcher-menu.tsx` split by responsibility:
- **Before:** 562 lines (monolithic: tile, grid, and orchestrator combined)
- `product-tile.tsx` (new): 176 lines — `ProductTile` component + `ICON_STROKE` constant
- `product-grid.tsx` (new): 126 lines — `ProductGrid` component + `PRODUCT_TO_LOCKED_MODULE`
- `product-switcher-menu.tsx` (updated): 266 lines — `ProductSwitcherMenu` orchestrator only
All three files under 300-line target.

## `lib/observability/error-reporter.ts:getSessionContext`
VERIFIED NOT DEAD — it is part of the observability module's public API surface (`lib/observability/index.ts` re-exports it). No static call-site exists because it is consumed by runtime reporter integrations (e.g. Sentry) registered via `setErrorReporter`. `check:dead-code` classifies it UNPROVEN (baseline 0/0 — PASS). Retained.

## Test summary
19 suites / 145 tests — all pass. All check scripts pass:
`check:formatters` ✓ · `check:query-scope` ✓ · `check:route-access-contract` ✓ · `check:module-manifest` ✓ · `check:dead-code` ✓

## OUT-OF-OWNERSHIP
None.

## NEW FINDINGS
None.
