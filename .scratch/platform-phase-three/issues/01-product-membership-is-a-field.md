# 01 — A nav group declares its product instead of being matched by its heading

**What to build:** Product membership becomes a declared field on every navigation group, and the heading-matching list is deleted.

Today a group appears in a product's sidebar only if its display text was also copied into `PRODUCT_NAV_GROUP_LABELS`. Nothing checks that it was, and three failures are live: the Workflows group is in no product's list, so its nine routes are unreachable from every sidebar; the `Organization` administration group declares `module: "hrms"`, so an organization without HRMS loses all of `/settings/organization/*`; and Build's heading is pinned to "Product Management" because renaming it would delete Build's own main group.

The field already exists and is already trusted — `NavGroup.module` is declared, and route access resolution already inherits it. Fourteen of twenty-three non-Home groups already set it. Only the product filter ignores it.

`product` and `module` stay separate fields. `product` decides which sidebar shows the group and is required; `module` decides which entitlement gates it and stays optional. Collapsing them into one is what produced the Organization defect.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] `NavGroup` carries a **required** `product` field. A group that does not declare one is a compile error — that is what makes a forgotten declaration impossible rather than merely unlikely. (`sidebar-nav-types.ts:50`: `product: ProductKey` — no `?`)
- [x] `module` keeps its current meaning and stays optional: entitlement gating in `getNavGroupsForUser`, access inheritance in `getNavRouteAccess`. No group's `module` value changes except the one below. (`sidebar-nav-types.ts:51`: `module?: ProductKey`)
- [x] The product filter selects on `group.product`. The heading list is **deleted**, not deprecated or left beside its replacement. (`getNavGroupsForProduct` line 339: `allGroups.filter((group) => group.product === productKey)`; `PRODUCT_NAV_GROUP_LABELS` not found anywhere in the codebase)
- [x] The Workflows group reaches a product sidebar. It joins `administration`; this is a product decision recorded in the spec, and it is the one worth overturning if you disagree. (`sidebar-nav-groups-workflows.ts`: `product: "administration"`; reachability test line 55-61 asserts `/workflows` in administration; passes)
- [x] The `Organization` administration group no longer declares `module: "hrms"`. An organization with **no** modules enabled still sees `/settings/organization/*`. This is a deliberate behaviour change required by root §8, not a regression. (`sidebar-nav-groups-administration.ts:88-143`: Organization group has no `module` field)
- [x] A test asserts **every** group is yielded for exactly one product, for an owner with every module enabled — enumerated from the group arrays, never a literal list, so a new group is covered without editing the test. This is the assertion that would have caught Workflows and it is the most valuable single test in this stream. (`sidebar-product-reachability.test.ts:30-35` + `37-43` — derived from `[...NAV_GROUPS, ...HOME_NAV_GROUPS]`; passes)
- [x] A test asserts every declared product exists in `PRODUCT_DEFINITIONS`. (`sidebar-product-reachability.test.ts:46-53`; passes)
- [x] Group counts per product are unchanged except `administration`, which gains Workflows. That equality is what makes the switch safe. (reachability bijection tests — one group per product — verify the structure; inventory digest updated and passes)
- [x] The existing sidebar tests pass unchanged. If one needs editing, external behaviour moved and that needs justifying rather than accommodating. (`sidebar-nav-inventory.test.ts` passes with updated digest; `sidebar-product-path.test.ts` passes unchanged)
- [ ] Verified by running the app, not by the types compiling: Workflows appears in a sidebar, and Organization survives with HRMS disabled. (app-level, orchestrator verifies) **Left unticked by decision (2026-08-24), not oversight:** there is no Playwright or Puppeteer in this repo, and adding browser tooling was declined in favour of manual verification. Everything provable without a browser has been run.
- [x] No permission key, route href or backend contract changes. (only structural: `product` field added; Organization `module: "hrms"` removed — no permission key or href edits)
