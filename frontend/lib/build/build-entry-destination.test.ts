import {
  resolveBuildEntryDestination,
  isAllowedLandingDestination,
} from "./build-entry-destination";

describe("Build entry destination", () => {
  it("lands on Command Center without a legacy Projects query", () => {
    expect(resolveBuildEntryDestination({})).toBe("/build/command-center");
    expect(resolveBuildEntryDestination({ unknown: "/access-denied" })).toBe(
      "/build/command-center",
    );
  });

  it("preserves legacy project creation and filters at the dedicated Projects route", () => {
    expect(
      resolveBuildEntryDestination({
        create: "1",
        q: "client work",
        filterStatus: "ACTIVE",
        unknown: "ignored",
      }),
    ).toBe("/build/projects?create=1&q=client+work&filterStatus=ACTIVE");
  });

  it("uses one value for repeated parameters without permitting an alternate redirect target", () => {
    expect(
      resolveBuildEntryDestination({ q: ["first", "second"], create: [] }),
    ).toBe("/build/projects?q=first");
  });
});

describe("BT-f02ef63c7b0f — saved landing preference", () => {
  it("uses a valid saved /build/ destination when no legacy query is present", () => {
    expect(
      resolveBuildEntryDestination({}, "/build/projects"),
    ).toBe("/build/projects");
  });

  it("falls back to command-center when saved destination is null", () => {
    expect(resolveBuildEntryDestination({}, null)).toBe("/build/command-center");
  });

  it("falls back to command-center when saved destination is undefined", () => {
    expect(resolveBuildEntryDestination({}, undefined)).toBe(
      "/build/command-center",
    );
  });

  it("legacy project query takes precedence over saved destination", () => {
    expect(
      resolveBuildEntryDestination({ create: "1" }, "/build/roadmap"),
    ).toBe("/build/projects?create=1");
  });

  it("isAllowedLandingDestination permits /build/ paths", () => {
    expect(isAllowedLandingDestination("/build/command-center")).toBe(true);
    expect(isAllowedLandingDestination("/build/projects")).toBe(true);
  });

  it("isAllowedLandingDestination rejects external and non-build paths", () => {
    expect(isAllowedLandingDestination("https://evil.com")).toBe(false);
    expect(isAllowedLandingDestination("/settings/billing")).toBe(false);
    expect(isAllowedLandingDestination("")).toBe(false);
  });

  it("isAllowedLandingDestination rejects traversal and backslash escapes out of /build/", () => {
    expect(isAllowedLandingDestination("/build/../../settings/billing")).toBe(false);
    expect(isAllowedLandingDestination("/build/%2e%2e/settings/billing")).toBe(false);
    expect(isAllowedLandingDestination("/build/./projects")).toBe(false);
    expect(isAllowedLandingDestination("/build/\\evil.com")).toBe(false);
  });

  it("isAllowedLandingDestination keeps a /build/ path with a query string", () => {
    expect(isAllowedLandingDestination("/build/projects?view=board")).toBe(true);
  });
});
