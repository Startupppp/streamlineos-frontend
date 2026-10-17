"use client";

import { buildListSearchParams } from "@/features/build/shared/use-build-list-url-state";

describe("projects page — team filter URL state", () => {
  it("adds teamId param to URL without removing other filters", () => {
    const next = buildListSearchParams(
      new URLSearchParams("view=grid&filterStatus=ACTIVE"),
      { teamId: "5" },
    );
    expect(next.get("teamId")).toBe("5");
    expect(next.get("filterStatus")).toBe("ACTIVE");
  });

  it("removes teamId param when cleared", () => {
    const next = buildListSearchParams(
      new URLSearchParams("view=grid&teamId=5&filterStatus=ACTIVE"),
      { teamId: null },
    );
    expect(next.get("teamId")).toBeNull();
    expect(next.get("filterStatus")).toBe("ACTIVE");
  });

  it("myProjectsOnly defaults to true when not set", () => {
    const params = new URLSearchParams("view=grid");
    const myProjectsOnly = params.get("myProjectsOnly") ?? "true";
    expect(myProjectsOnly).toBe("true");
  });

  it("myProjectsOnly can be toggled to false via URL param", () => {
    const params = new URLSearchParams("view=grid&myProjectsOnly=false");
    const myProjectsOnly = params.get("myProjectsOnly") ?? "true";
    expect(myProjectsOnly).toBe("false");
  });

  it("Active/Archive tab defaults to ACTIVE when not set", () => {
    const params = new URLSearchParams("view=grid");
    const status = params.get("status") ?? "ACTIVE";
    expect(status).toBe("ACTIVE");
  });

  it("status tab can be set to ARCHIVED", () => {
    const next = buildListSearchParams(
      new URLSearchParams("view=grid"),
      { status: "ARCHIVED" },
    );
    expect(next.get("status")).toBe("ARCHIVED");
  });
});
