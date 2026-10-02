import { resolveBuildEntryDestination } from "./build-entry-destination";

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
