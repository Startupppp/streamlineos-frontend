import { buildWorkspaceCatalog } from "./build-workspace-catalog";

const BASE = "/build/workspaces/ws-42";
const catalog = buildWorkspaceCatalog(BASE);

describe("buildWorkspaceCatalog (BSN-01-031)", () => {
  it("returns at most nine primary destinations (BSN-01-A07)", () => {
    expect(catalog.primary.length).toBeLessThanOrEqual(9);
  });

  it("includes a Goals destination pointing at the roadmap sub-path (BSN-01-021)", () => {
    const goalsEntry = catalog.primary.find((d) => d.id === "workspace-goals");
    expect(goalsEntry).toBeDefined();
    expect(goalsEntry?.href).toBe(`${BASE}/goals`);
  });

  it("gates Goals on the build:goals:view permission (BSN-01-021)", () => {
    const goalsEntry = catalog.primary.find((d) => d.id === "workspace-goals");
    expect(goalsEntry?.requiredPermission).toBe("build:goals:view");
  });

  it("includes a Roadmap destination pointing at the roadmap sub-path (BSN-01-021)", () => {
    const roadmapEntry = catalog.primary.find((d) => d.id === "workspace-roadmap");
    expect(roadmapEntry).toBeDefined();
    expect(roadmapEntry?.href).toBe(`${BASE}/roadmap`);
  });

  it("gates Roadmap on the build:roadmap:view permission (BSN-01-021)", () => {
    const roadmapEntry = catalog.primary.find((d) => d.id === "workspace-roadmap");
    expect(roadmapEntry?.requiredPermission).toBe("build:roadmap:view");
  });

  it("keeps every destination inside the workspace base path", () => {
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
