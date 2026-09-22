import {
  buildScopeCatalog,
  isBuildDestinationActive,
  resolveBuildNavModel,
} from "./build-nav-model";
import { toBuildNavGroups } from "./build-nav-groups";
import { resolveBuildScope } from "./build-scope";
import { BUILD_NAV_MAX_PRIMARY } from "./nav/build-nav-destination";
import { BUILD_MY_WORK_DESTINATIONS } from "./nav/build-stable-destinations";
import { MAX_MOBILE_MODULE_TABS } from "@/components/layout/mobile/mobile-module-nav-items";

const PROJECT_PATH = "/build/42";
const scope = resolveBuildScope(PROJECT_PATH);
const catalog = buildScopeCatalog(scope);
const primaryIds = catalog.primary.map((destination) => destination.id);
const moreToolsIds = catalog.moreTools.map((destination) => destination.id);

const PRD_PRIMARY_IDS = [
  "project-overview",
  "project-issues",
  "project-backlog",
  "project-cycles",
  "project-timeline",
  "project-releases",
  "project-updates",
  "project-files",
  "project-client-portal",
];

describe("BSN-01-033 — Overview is the selected scope landing destination", () => {
  it("project-overview is primary[0] for a project scope so selecting a project lands on Overview", () => {
    expect(catalog.primary[0].id).toBe("project-overview");
  });

  it("project-overview href equals the bare project basePath so navigation to the project root opens Overview", () => {
    expect(catalog.primary[0].href).toBe(scope.basePath);
  });

  it("project-overview carries exact: true so it does not own its subtree and no child path activates it", () => {
    expect(catalog.primary[0].exact).toBe(true);
  });

  it("the bare project basePath matches exactly one catalog destination, so the active highlight cannot flicker between two", () => {
    const allEntries = [
      ...catalog.primary,
      ...catalog.moreTools,
      ...(catalog.settings ? [catalog.settings] : []),
    ];
    const activeAtBase = allEntries.filter((destination) =>
      isBuildDestinationActive(destination, scope.basePath, null),
    );
    expect(activeAtBase).toHaveLength(1);
    expect(activeAtBase[0].id).toBe("project-overview");
  });
});

describe("BSN-01-033 — Cycles points at the canonical iteration route", () => {
  it("project-cycles href is the basePath's /cycles route, not the removed /sprints duplicate", () => {
    const cycles = catalog.primary.find(
      (destination) => destination.id === "project-cycles",
    );
    expect(cycles?.href).toBe(`${scope.basePath}/cycles`);
  });
});

describe("BSN-01-033 — complete project catalog", () => {
  it("project-updates is in primary so Updates is directly visible without opening More tools", () => {
    expect(primaryIds).toContain("project-updates");
  });

  it("project-files is in primary so Files is directly visible without opening More tools", () => {
    expect(primaryIds).toContain("project-files");
  });

  it("project-updates is absent from moreTools after promotion to primary so it does not appear in two places", () => {
    expect(moreToolsIds).not.toContain("project-updates");
  });

  it("project-files is absent from moreTools after promotion to primary so it does not appear in two places", () => {
    expect(moreToolsIds).not.toContain("project-files");
  });

  it("the complete project primary set matches the PRD order: Overview, Issues, Backlog, Cycles, Timeline, Releases, Updates, Files, Client portal", () => {
    expect(primaryIds).toEqual(PRD_PRIMARY_IDS);
  });

  it("the project primary catalog sits at the BUILD_NAV_MAX_PRIMARY ceiling, so a tenth destination fails here instead of silently truncating Client portal", () => {
    expect(catalog.primary.length).toBe(BUILD_NAV_MAX_PRIMARY);
  });
});

describe("BSN-01-033 — promoting a destination to primary does not rearrange the mobile bottom navigation", () => {
  const work = [...catalog.primary, ...BUILD_MY_WORK_DESTINATIONS];

  it("inspects a non-trivial number of work destinations, so a catalog that stopped loading cannot pass vacuously", () => {
    expect(work.length).toBeGreaterThan(BUILD_NAV_MAX_PRIMARY);
  });

  it("no two project work destinations declare the same mobilePriority, so tab order never depends on sort stability", () => {
    const declared = work
      .map((destination) => destination.mobilePriority)
      .filter((priority): priority is number => priority !== undefined);
    expect(declared).toHaveLength(new Set(declared).size);
  });

  it("Inbox stays within the first five work routes, so promoting Updates and Files never pushes the badged notification tab off the mobile bottom bar", () => {
    const model = resolveBuildNavModel({
      scope,
      access: {
        can: () => true,
        isOrgModuleEnabled: () => true,
        isCapabilityEnabled: () => true,
      },
      pinnedIds: [],
    });
    const [workGroup] = toBuildNavGroups(model);
    const inboxIndex = workGroup.routes.findIndex(
      (route) => route.label === "Inbox",
    );
    expect(inboxIndex).toBeGreaterThanOrEqual(0);
    expect(inboxIndex).toBeLessThan(MAX_MOBILE_MODULE_TABS);
  });
});
