import { ORG_MODULE_NAME } from "@/lib/module-vocabulary";
import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import { NAV_GROUPS, getNavGroupsForProduct } from "./sidebar-nav-items";
import { PRODUCT_DEFINITIONS } from "./sidebar-products";
import type { NavGroup, ProductKey } from "./sidebar-nav-types";

const EVERY_MODULE = [...Object.keys(ORG_MODULE_NAME), "timesheets"];

const EVERY_PRODUCT: ProductKey[] = PRODUCT_DEFINITIONS.map(
  (product) => product.key,
);

const DECLARED_GROUPS: NavGroup[] = [...NAV_GROUPS, ...HOME_NAV_GROUPS];

function groupsShownFor(product: ProductKey): NavGroup[] {
  return getNavGroupsForProduct(product, "OWNER", {}, EVERY_MODULE);
}

describe("every navigation group is reachable from a product", () => {
  const productsByGroupLabel = new Map<string, ProductKey[]>();
  for (const product of EVERY_PRODUCT) {
    for (const group of groupsShownFor(product)) {
      const found = productsByGroupLabel.get(group.label) ?? [];
      found.push(product);
      productsByGroupLabel.set(group.label, found);
    }
  }

  // Catches the Workflows case: assembled into the tree, named in no product, reachable only by URL.
  it("shows every declared group in exactly one product", () => {
    const unreachable = DECLARED_GROUPS.filter(
      (group) => (productsByGroupLabel.get(group.label) ?? []).length === 0,
    ).map((group) => `${group.label} (declares product=${group.product})`);

    expect(unreachable).toEqual([]);
  });

  it("never shows one group in two products", () => {
    const duplicated = [...productsByGroupLabel.entries()]
      .filter(([, products]) => products.length > 1)
      .map(([label, products]) => `${label}: ${products.join(", ")}`);

    expect(duplicated).toEqual([]);
  });

  it("only declares products that exist in the product switcher", () => {
    const known = new Set<string>(EVERY_PRODUCT);
    const unknown = DECLARED_GROUPS.filter(
      (group) => !known.has(group.product),
    ).map((group) => `${group.label} -> ${group.product}`);

    expect(unknown).toEqual([]);
  });

  it("puts the workflow automation screens in a product sidebar", () => {
    const hrefs = groupsShownFor("administration")
      .flatMap((group) => group.routes)
      .map((route) => route.href);

    expect(hrefs).toContain("/workflows");
  });
});
