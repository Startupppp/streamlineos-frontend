import {
  MANAGED_PRODUCT_ROUTE_TITLES,
  managedProductRouteTitle,
} from "./managed-product-route-title";

describe("managedProductRouteTitle", () => {
  it.each([
    ["/build/managed-products/42", "Overview"],
    ["/build/managed-products/42/feedback", "Feedback"],
    ["/build/managed-products/42/insights", "Insights"],
    ["/build/managed-products/42/roadmap", "Roadmap"],
    ["/build/managed-products/42/releases", "Releases"],
    ["/build/managed-products/42/goals", "Goals & OKRs"],
    ["/build/managed-products/42/projects", "Linked Projects"],
    ["/build/managed-products/42/settings?tab=members", "Settings"],
  ])("resolves %s to %s", (pathname, title) => {
    expect(managedProductRouteTitle(pathname)).toBe(title);
  });

  it("falls back to Overview for an unknown nested route", () => {
    expect(managedProductRouteTitle("/build/managed-products/42/unknown")).toBe(
      MANAGED_PRODUCT_ROUTE_TITLES.overview,
    );
  });
});
