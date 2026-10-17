import { resolveBuildNavModel } from "./build-nav-model";
import { ORGANIZATION_BUILD_SCOPE } from "./build-scope";
import type { BuildNavAccess } from "./nav/build-nav-destination";

const buildViewAccess: BuildNavAccess = {
  can: (permission) => permission === "build:view",
  isOrgModuleEnabled: () => true,
  isCapabilityEnabled: () => true,
};

test("Build search is exposed through the shared permission-filtered navigation model", () => {
  const model = resolveBuildNavModel({
    scope: ORGANIZATION_BUILD_SCOPE,
    access: buildViewAccess,
    pinnedIds: [],
  });

  expect(model.myWork).toEqual([
    expect.objectContaining({
      id: "build-search",
      label: "Search",
      href: "/build/search",
      requiredPermission: "build:view",
    }),
  ]);
});
