# Route registry — product membership is a field, not a label match

Status: ready-for-tickets · 2026-08-23 · derived from `architecture-review-20260820-1.html` candidate 4, re-verified against the tree.

## Problem Statement

Which product a screen belongs to is decided by matching a human-readable sidebar heading against a list of strings. `getNavGroupsForProduct` (`components/layout/sidebar/sidebar-nav-items.ts:292`) returns `allGroups.filter((g) => labels.includes(g.label))`, where `labels` comes from `PRODUCT_NAV_GROUP_LABELS` (`sidebar-products.ts:148`).

So a nav group appears in a product's sidebar only if someone remembered to copy its display text into a second file. Nothing checks that they did, and the failure is silent — the group simply is not there.

Three consequences are live in the product today.

**The Workflows group is unreachable from every product.** `WORKFLOWS_NAV_GROUPS` is spread into `NAV_GROUPS` (`sidebar-nav-items.ts:66`) and returned by `getNavGroupsForUser`, but no product's entry in `PRODUCT_NAV_GROUP_LABELS` contains `"Workflows"`. Its nine routes — dashboard, templates, executions, approvals, scheduler, analytics, variables, secrets, access — are permission-gated, built, and reachable by URL only. This is the exact failure the string match invites.

**Global administration is gated on a product module.** The `Organization` group (`sidebar-nav-groups-administration.ts:85`) declares `module: "hrms"`, and `getNavGroupsForUser:136` drops any group whose module is not enabled. An organization without HRMS loses `/settings/organization/*` entirely — structure, business units, branches, departments, teams, locations, cost centers and the organization chart. Root `CLAUDE.md` §8 places global administration at `/settings/*` and makes hierarchy archive/restore a core administration concern, not an HR feature.

**A heading cannot be renamed.** Build's group heading is `"Product Management"` (`sidebar-nav-groups-work-management.ts:78`) and `PRODUCT_NAV_GROUP_LABELS.build` is `["Product Management", "More"]`. Renaming the heading to match the Build rename in root §8 removes Build's main group from Build's sidebar. The display string is load-bearing, so the product name users see is pinned to the old vocabulary by the routing mechanism.

Separately, `getProductFromPathname` (`sidebar-products.ts:197`) re-derives the same product fact a second way, from a 28-branch URL prefix chain, with no mechanism keeping the two answers consistent.

## Solution

Product membership becomes a declared field on the nav group, and the label list is deleted. The seam already exists and is already trusted elsewhere: `NavGroup.module` is declared in `sidebar-nav-types.ts:49`, and `getNavRouteAccess` already walks groups inheriting `group.module` (`sidebar-nav-items.ts:250`). Fourteen of the twenty-three non-Home groups already set it. Only `getNavGroupsForProduct` ignores it.

The design correction over the source review: **product membership and module entitlement are different facts and must not share one field.** Today `module` means both "which product sidebar shows this" and "which entitlement gates this", which is why the Organization group is gated on HRMS — the only way to say "this belongs with administration" was a field that also means "HR must be enabled". A group declares:

```
{ product: ProductKey, module?: ModuleKey, label, requiredPermission?, routes }
```

`product` is required and decides the sidebar. `module` stays optional and decides entitlement. Administration groups get `product: "administration"` and no `module`, which fixes the gating defect as a consequence of the shape rather than as a separate patch.

Once membership is a field, the heading is free text again and can say "Build".

## User Stories

1. As an organization with Workflows enabled, I want the Workflows screens to appear in a product sidebar, so that I can reach them without typing a URL.
2. As an organization without HRMS, I want `/settings/organization/*` to remain visible, so that I can manage my branches and departments.
3. As a user of the Build product, I want the sidebar heading to say "Build", so that the name matches the product I opened.
4. As an engineer adding a screen, I want to declare its product once, so that I cannot half-add it.
5. As an engineer adding a nav group, I want a missing product to be a compile error, so that the mistake cannot reach a browser.
6. As an engineer renaming a heading, I want nothing else to break, so that copy changes are copy changes.
7. As an engineer, I want a test that fails when a group is reachable from no product, so that the Workflows defect cannot recur.
8. As an engineer, I want a test that fails when a group claims a product that does not exist, so that a typo is caught at test time.
9. As a reviewer, I want one place that answers "which product is this screen in", so that I do not have to reconcile a label list against a prefix chain.
10. As a user deep-linking to a screen, I want the correct product to be active in the switcher, so that the sidebar around me matches the page.
11. As an organization administrator, I want administration screens to stay available regardless of which paid modules I have, so that I can always govern my workspace.
12. As an engineer deleting a product, I want the type system to tell me every group that referenced it, so that I do not leave a group orphaned.

## Implementation Decisions

- **`NavGroup.product` is required.** `NavGroup.module` stays optional and keeps its current meaning — entitlement gating in `getNavGroupsForUser` and access inheritance in `getNavRouteAccess`. Making `product` required is what turns a forgotten declaration into a compile error, and is the whole point of the change.
- **`getNavGroupsForProduct` filters on `group.product`.** `PRODUCT_NAV_GROUP_LABELS` is deleted, not deprecated.
- **The Organization administration group loses `module: "hrms"`** and gains `product: "administration"`. This is a deliberate behaviour change: the group becomes visible to organizations without HRMS, which root §8 requires. It is called out here so it is not mistaken for a regression.
- **Home keeps its separate path.** `getNavGroupsForProduct` short-circuits `home` to `getHomeNavGroups`, which reads `HOME_NAV_GROUPS`. Home groups get `product: "home"` for consistency and for the reachability test, but the short-circuit stays — Home's membership was never in question and rewiring it adds risk for nothing.
- **Workflows is assigned a product rather than given its own.** It has no entry in `PRODUCT_DEFINITIONS`, so introducing `product: "workflows"` would require a new product tile, a module key, an accent, a description and an entitlement story. Workflows is automation over other modules; it belongs in `administration`, whose heading already reads as workspace governance. Recorded here because it is a product decision, not a mechanical one, and it is the one decision in this spec a reader might want to overturn.
- **`getProductFromPathname` is derived, not deleted outright.** It answers for paths the nav model does not contain (`/parties`, `/customer-executive`, `/portal`, `/sales`). It becomes a longest-prefix match over the nav model plus an explicit, named table of non-nav prefixes, so the two sources cannot silently disagree and the exceptions are visible.
- **No permission key, route href or backend contract changes.** This is a navigation-assembly change only.

## Testing Decisions

A good test here drives the exported navigation functions with realistic role and permission inputs and asserts what a user would see — which groups a product yields — not which internal array was consulted. The existing suite already works this way (`sidebar-permission-navigation.test.ts` calls `getNavGroupsForProduct` with a role and a permission list), and that is the prior art to follow.

- **Reachability is the headline test:** every group in `NAV_GROUPS` and `HOME_NAV_GROUPS` is yielded by `getNavGroupsForProduct` for exactly one product, given an owner with every module enabled. This is the assertion that would have caught Workflows, and it must enumerate the groups rather than list them, so a new group is covered without editing the test.
- **Every declared product exists** in `PRODUCT_DEFINITIONS`.
- **The Organization group is yielded for `administration` with no modules enabled** — the direct regression test for the entitlement defect.
- **Group counts per product are unchanged** for every product except `administration` (which gains Workflows) — the equality that makes this safe, in the same spirit as the module registry stream's derived-value equality test.
- `sidebar-permission-coverage.test.ts` and `sidebar-nav-items.test.ts` pass unchanged. If either needs editing, behaviour moved and that needs justifying.

## Out of Scope

- The backend module registry (`MODULE_CATALOG`, `ACCESS_MANAGED_MODULES`). That is the module registry stream; this spec touches only web navigation assembly.
- The command palette and mobile bottom nav, which already consume `getNavGroupsForUser` and are unaffected by how groups are partitioned into products.
- Introducing a `workflows` product tile.
- The list-view seam, which shares no files with this work.

## Further Notes

Counts verified against the tree on 2026-08-23: 23 non-Home groups, 14 already declaring `module`, 9 not; `PRODUCT_NAV_GROUP_LABELS` covering 13 products and 21 distinct labels.

The review framed this as building a route registry from nothing. It is not — `NavGroup` already carries the fields, and one of four consumers ignores them. Scoping it as "make the existing field authoritative" is what keeps it a small change rather than a rewrite.
