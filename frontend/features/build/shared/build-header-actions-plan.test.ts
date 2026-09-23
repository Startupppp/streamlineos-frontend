import {
  BUILD_HEADER_DESKTOP_VISIBLE,
  planBuildHeaderActions,
  type BuildHeaderAction,
} from "./build-header-actions-plan";

function action(id: string, primary = false): BuildHeaderAction {
  return { id, label: id, primary };
}

describe("Build header action contract", () => {
  it("renders nothing when a role holds no action", () => {
    expect(planBuildHeaderActions([]).isEmpty).toBe(true);
  });

  it("gives a lone action the whole mobile row", () => {
    const plan = planBuildHeaderActions([action("create", true)]);
    expect(plan.mobileInline.map((a) => a.id)).toEqual(["create"]);
    expect(plan.mobileOverflow).toHaveLength(0);
  });

  it("splits exactly two actions across one row instead of stacking them", () => {
    const plan = planBuildHeaderActions([
      action("resume"),
      action("create", true),
    ]);
    expect(plan.mobileInline.map((a) => a.id)).toEqual(["resume", "create"]);
    expect(plan.mobileOverflow).toHaveLength(0);
  });

  it("keeps the primary beside an overflow once a third action appears", () => {
    const plan = planBuildHeaderActions([
      action("import"),
      action("export"),
      action("create", true),
    ]);
    expect(plan.mobileInline.map((a) => a.id)).toEqual(["create"]);
    expect(plan.mobileOverflow.map((a) => a.id)).toEqual(["import", "export"]);
  });

  it("promotes the first secondary when no action is primary", () => {
    const plan = planBuildHeaderActions([
      action("import"),
      action("export"),
      action("archive"),
    ]);
    expect(plan.mobileInline.map((a) => a.id)).toEqual(["import"]);
    expect(plan.mobileOverflow.map((a) => a.id)).toEqual(["export", "archive"]);
  });

  it("renders the primary last on desktop, secondary first", () => {
    const plan = planBuildHeaderActions([
      action("import"),
      action("create", true),
    ]);
    expect(plan.desktopInline.map((a) => a.id)).toEqual(["import", "create"]);
  });

  it("never shows more than three actions on desktop", () => {
    const plan = planBuildHeaderActions([
      action("a"),
      action("b"),
      action("c"),
      action("d"),
      action("create", true),
    ]);
    expect(plan.desktopInline).toHaveLength(BUILD_HEADER_DESKTOP_VISIBLE);
    expect(plan.desktopInline.at(-1)?.id).toBe("create");
    expect(plan.desktopOverflow.map((a) => a.id)).toEqual(["c", "d"]);
  });
});
