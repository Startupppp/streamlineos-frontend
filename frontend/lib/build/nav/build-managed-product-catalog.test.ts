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

  it("does NOT include a Feedback destination because the backend feedbackListQuerySchema has no managedProductId filter", () => {
    const feedbackEntry = catalog.primary.find(
      (d) => d.href.includes("feedback"),
    );
    expect(feedbackEntry).toBeUndefined();
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
});
