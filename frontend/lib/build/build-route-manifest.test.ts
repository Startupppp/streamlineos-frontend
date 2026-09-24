import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { BUILD_ROUTE_MANIFEST, BuildRouteManifestEntrySchema } from "./build-route-manifest";

const APP_AUTH_DIR = resolve(__dirname, "../../app/(authenticated)");
const APP_BUILD_DIR = join(APP_AUTH_DIR, "build");

function collectPageFilePaths(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectPageFilePaths(full));
    } else if (entry.name === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

function absolutePathToRoute(absolutePath: string): string {
  const rel = relative(APP_AUTH_DIR, absolutePath);
  const normalized = rel.split(sep).join("/");
  return "/" + normalized.replace(/\/page\.tsx$/, "");
}

const manifestRoutes = new Set(BUILD_ROUTE_MANIFEST.map((e) => e.route));
const diskRoutes = new Set(
  collectPageFilePaths(APP_BUILD_DIR).map(absolutePathToRoute),
);

describe("BLD-001 — build route manifest covers all 65 authenticated build pages bidirectionally", () => {
  it("manifest has 65 entries so the coverage check cannot pass vacuously with an empty or truncated list", () => {
    expect(BUILD_ROUTE_MANIFEST).toHaveLength(65);
  });

  it("no longer tracks the twenty-six routes whose next.config.ts redirect now serves the URL, because a manifest entry without a page is a phantom disposition", () => {
    const routes = BUILD_ROUTE_MANIFEST.map((entry) => entry.route);
    for (const removed of [
      "/build/access",
      "/build/members",
      "/build/client-access",
      "/build/drafts",
      "/build/goal",
      "/build/goal/[goalId]",
      "/build/pm-workspaces",
      "/build/[projectId]/workflow",
      "/build/[projectId]/automations",
      "/build/[projectId]/webhooks",
      "/build/[projectId]/my-tickets",
      "/build/workspaces",
      "/build/workspaces/[pmWorkspaceId]",
      "/build/workspaces/[pmWorkspaceId]/all-work",
      "/build/workspaces/[pmWorkspaceId]/goals",
      "/build/workspaces/[pmWorkspaceId]/overview",
      "/build/workspaces/[pmWorkspaceId]/products",
      "/build/workspaces/[pmWorkspaceId]/roadmap",
      "/build/workspaces/[pmWorkspaceId]/teams",
      "/build/workspaces/[pmWorkspaceId]/my-work",
      "/build/[projectId]/timeline",
      "/build/[projectId]/bugs",
      "/build/[projectId]/analytics",
      "/build/[projectId]/views",
      "/build/[projectId]/ai",
      "/build/customers",
    ]) {
      expect(routes).not.toContain(removed);
    }
    for (const canonical of [
      "/build/settings/access",
      "/build/settings/client-access",
      "/build/inbox",
      "/build/my-work",
      "/build/goals",
      "/build/goals/[goalId]",
      "/build/command-center",
      "/build/all-work",
      "/build/managed-products",
      "/build/roadmap",
      "/build/teams",
      "/build/[projectId]/settings/workflow",
      "/build/[projectId]/settings/automations",
      "/build/[projectId]/settings/integrations/webhooks",
      "/build/[projectId]/issues",
      "/build/[projectId]/reports",
    ]) {
      expect(routes).toContain(canonical);
    }
  });

  it("still tracks intake, and keeps it, because the generated contract proves neither Forms nor Triage can absorb its job", () => {
    const entry = BUILD_ROUTE_MANIFEST.find(
      (e) => e.route === "/build/[projectId]/intake",
    );
    expect(entry).toEqual({
      route: "/build/[projectId]/intake",
      decision: "KEEP",
      target: null,
    });
  });

  it("disk route count matches manifest count so neither direction can silently absorb extra entries", () => {
    expect(diskRoutes.size).toBe(BUILD_ROUTE_MANIFEST.length);
  });

  it("every manifest route has a page.tsx on disk so no phantom disposition can exist in the manifest", () => {
    const missing = [...manifestRoutes].filter((route) => !diskRoutes.has(route));
    expect(missing).toEqual([]);
  });

  it("every page.tsx on disk appears in the manifest so no unreviewed route can land undetected", () => {
    const untracked = [...diskRoutes].filter((route) => !manifestRoutes.has(route));
    expect(untracked).toEqual([]);
  });
});

describe("BLD-001 — intake is retained because the generated contract gives it a job Forms and Triage do not have", () => {
  const contract = JSON.parse(
    readFileSync(resolve(__dirname, "../../contracts/openapi.json"), "utf8"),
  ) as {
    paths: Record<string, Record<string, { "x-permission"?: string }>>;
  };
  const paths = contract.paths;

  const intakeRow = () => {
    const response = paths["/build/{projectId}/intake"].get as unknown as {
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: {
                properties: {
                  data: {
                    properties: {
                      data: {
                        items: { properties: Record<string, unknown> };
                      };
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
    return response.responses["200"].content["application/json"].schema
      .properties.data.properties.data.items.properties;
  };

  it("intake owns three endpoints of its own, so retiring the page would strand a live resource", () => {
    expect(Object.keys(paths["/build/{projectId}/intake"]).sort()).toEqual([
      "get",
      "post",
    ]);
    expect(Object.keys(paths["/build/{projectId}/intake/{requestId}"])).toEqual([
      "patch",
    ]);
  });

  it("triage owns no endpoint at all, so it cannot be the destination for intake submissions", () => {
    const triagePaths = Object.keys(paths).filter((p) => p.includes("triage"));
    expect(triagePaths).toEqual([]);
  });

  it("forms owns definitions and its own submissions, a resource whose rows carry none of intake's fields", () => {
    expect(paths["/build/{projectId}/forms"]).toBeDefined();
    expect(
      paths["/build/{projectId}/forms/{formId}/submissions"],
    ).toBeDefined();
    const formsList = JSON.stringify(paths["/build/{projectId}/forms"].get);
    expect(formsList).not.toContain("linkedWorkItemId");
    expect(formsList).not.toContain("declineReason");
  });

  it("only intake rows carry the accepted-to-work-item link and the decline reason that its accept and decline flows write", () => {
    expect(Object.keys(intakeRow())).toEqual(
      expect.arrayContaining(["linkedWorkItemId", "declineReason", "source"]),
    );
  });

  it("intake is gated by a different permission family than forms, so consolidating it would silently move the access boundary", () => {
    expect(paths["/build/{projectId}/intake"].post["x-permission"]).toBe(
      "build:workspace:manage",
    );
    expect(paths["/build/{projectId}/forms"].post["x-permission"]).toBe(
      "build:forms:manage",
    );
  });
});

describe("BLD-001 — target field invariant enforced by schema", () => {
  it("schema rejects a CONSOLIDATE entry with a null target so a migration without a destination cannot be authored", () => {
    const result = BuildRouteManifestEntrySchema.safeParse({
      route: "/build/fake",
      decision: "CONSOLIDATE",
      target: null,
    });
    expect(result.success).toBe(false);
  });

  it("schema rejects a MOVE entry with a null target so a move without a destination cannot be authored", () => {
    const result = BuildRouteManifestEntrySchema.safeParse({
      route: "/build/fake",
      decision: "MOVE",
      target: null,
    });
    expect(result.success).toBe(false);
  });

  it("schema rejects a DELETE entry with a null target so a deletion without an owning module cannot be authored", () => {
    const result = BuildRouteManifestEntrySchema.safeParse({
      route: "/build/fake",
      decision: "DELETE",
      target: null,
    });
    expect(result.success).toBe(false);
  });

  it("schema rejects a KEEP entry with a non-null target so no dead-link target can exist on a retained route", () => {
    const result = BuildRouteManifestEntrySchema.safeParse({
      route: "/build/fake",
      decision: "KEEP",
      target: "/somewhere",
    });
    expect(result.success).toBe(false);
  });

  it("every non-KEEP entry has a non-empty target so every killed route names its migration destination", () => {
    const violations = BUILD_ROUTE_MANIFEST.filter(
      (e) => e.decision !== "KEEP" && e.target === "",
    );
    expect(violations).toEqual([]);
  });
});
