import { buildManagedProductCatalog } from "./build-managed-product-catalog";

const BASE = "/build/managed-products/7";
const catalog = buildManagedProductCatalog(BASE);

describe("buildManagedProductCatalog (BSN-01-032)", () => {
  it("returns at most nine primary destinations (BSN-01-A07)", () => {
    expect(catalog.primary.length).toBeLessThanOrEqual(9);
  });

  it("includes a Goals destination pointing at the goals sub-path (BSN-01-022)", () => {
    const goalsEntry = catalog.primary.find((d) => d.id === "product-goals");
    expect(goalsEntry).toBeDefined();
    expect(goalsEntry?.href).toBe(`${BASE}/goals`);
  });

  it("gates Goals on the build:goals:view permission (BSN-01-022)", () => {
    const goalsEntry = catalog.primary.find((d) => d.id === "product-goals");
    expect(goalsEntry?.requiredPermission).toBe("build:goals:view");
  });

  it("includes a Roadmap destination pointing at the roadmap sub-path (BSN-01-022)", () => {
    const roadmapEntry = catalog.primary.find((d) => d.id === "product-roadmap");
    expect(roadmapEntry).toBeDefined();
    expect(roadmapEntry?.href).toBe(`${BASE}/roadmap`);
  });

  it("gates Roadmap on the build:roadmap:view permission (BSN-01-022)", () => {
    const roadmapEntry = catalog.primary.find((d) => d.id === "product-roadmap");
    expect(roadmapEntry?.requiredPermission).toBe("build:roadmap:view");
  });

  it("includes a Feedback destination scoped to the product base path (BSN-01-012)", () => {
    const feedbackEntry = catalog.primary.find((d) => d.id === "product-feedback");
    expect(feedbackEntry).toBeDefined();
    expect(feedbackEntry?.href).toBe(`${BASE}/feedback`);
  });

  it("gates Feedback on feedbucket:submissions:view (BSN-01-012)", () => {
    const feedbackEntry = catalog.primary.find((d) => d.id === "product-feedback");
    expect(feedbackEntry?.requiredPermission).toBe("feedbucket:submissions:view");
  });

  it("gates Feedback behind the feedbucket org module so it is hidden when feedbucket is not enabled (BSN-01-012)", () => {
    const feedbackEntry = catalog.primary.find((d) => d.id === "product-feedback");
    expect(feedbackEntry?.requiredOrgModule).toBe("feedbucket");
  });

  it("includes an Insights destination scoped to the product base path (BSN-01-022)", () => {
    const insightsEntry = catalog.primary.find((d) => d.id === "product-insights");
    expect(insightsEntry).toBeDefined();
    expect(insightsEntry?.href).toBe(`${BASE}/insights`);
  });

  it("gates Insights on build:managed-products:view (BSN-01-022)", () => {
    const insightsEntry = catalog.primary.find((d) => d.id === "product-insights");
    expect(insightsEntry?.requiredPermission).toBe("build:managed-products:view");
  });

  it("does NOT include a Changelog destination because the backend changelogListQuerySchema has no managedProductId filter", () => {
    const changelogEntry = catalog.primary.find(
      (d) => d.href.includes("changelog"),
    );
    expect(changelogEntry).toBeUndefined();
  });

  it("keeps every destination inside the product base path", () => {
    for (const dest of catalog.primary) {
      expect(
        dest.href === BASE || dest.href.startsWith(`${BASE}/`),
      ).toBe(true);
    }
  });

  it("assigns unique ids to all primary destinations", () => {
    const ids = catalog.primary.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("orders the product scope evidence-first, exactly as the 01-ia-navigation.md scope table specifies", () => {
    expect(catalog.primary.map((d) => d.id)).toEqual([
      "product-overview",
      "product-feedback",
      "product-insights",
      "product-roadmap",
      "product-goals",
      "product-projects",
    ]);
  });

  it("keeps mobilePriority in the same order as the desktop rail so the mobile bar cannot disagree with the sidebar", () => {
    const priorities = catalog.primary.map((d) => d.mobilePriority);
    expect(priorities).toEqual([...priorities].sort((a, b) => (a ?? 0) - (b ?? 0)));
    expect(priorities.every((p) => p !== undefined)).toBe(true);
  });

  it("covers every managed-product route on disk except the list index, so no product sub-route is unreachable from the rail", () => {
    expect(catalog.primary.map((d) => d.href)).toEqual([
      BASE,
      `${BASE}/feedback`,
      `${BASE}/insights`,
      `${BASE}/roadmap`,
      `${BASE}/goals`,
      `${BASE}/projects`,
    ]);
  });
});
