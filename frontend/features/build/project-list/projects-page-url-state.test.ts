import { buildListSearchParams } from "@/features/build/shared/use-build-list-url-state";

describe("ProjectsPage URL state", () => {
  it("preserves unrelated state while writing project filters and resets pagination", () => {
    const next = buildListSearchParams(
      new URLSearchParams("view=grid&filterStatus=ACTIVE&cursor=stale"),
      { filterStatus: "CLOSED", filterHealth: "AT_RISK" },
      { resetCursor: true },
    );

    expect(next.toString()).toBe(
      "view=grid&filterStatus=CLOSED&filterHealth=AT_RISK",
    );
  });

  it("removes cleared project filters without removing the selected view", () => {
    const next = buildListSearchParams(
      new URLSearchParams("view=grid&filterStatus=ACTIVE&filterHealth=AT_RISK"),
      { filterStatus: null, filterHealth: null },
    );

    expect(next.toString()).toBe("view=grid");
  });
});
