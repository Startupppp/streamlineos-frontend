import {
  SAVED_VIEW_LAYOUTS,
  VIEW_TYPES,
  isKnownViewParam,
  isViewType,
  parseViewType,
  toSavedViewLayout,
  type ViewType,
} from "./view-types";

describe("view type vocabulary", () => {
  it("exposes timeline and no longer exposes gantt as a view type", () => {
    expect(VIEW_TYPES).toContain("timeline");
    expect(VIEW_TYPES).not.toContain("gantt");
  });

  it("parses every view type back to itself", () => {
    for (const view of VIEW_TYPES) {
      expect(parseViewType(view)).toBe(view);
    }
  });

  it("falls back to board for an unknown or absent view param", () => {
    expect(parseViewType(null)).toBe("board");
    expect(parseViewType("")).toBe("board");
    expect(parseViewType("nonsense")).toBe("board");
  });

  it("rejects gantt as a strict view type while still accepting it as a param", () => {
    expect(isViewType("gantt")).toBe(false);
    expect(isKnownViewParam("gantt")).toBe(true);
  });
});

describe("legacy gantt deep links", () => {
  it("resolves ?view=gantt to the timeline view", () => {
    expect(parseViewType("gantt")).toBe("timeline");
  });

  it("keeps a saved view persisted as gantt rendering as timeline", () => {
    expect(parseViewType("gantt")).toBe("timeline");
  });
});

describe("saved view persistence boundary", () => {
  it("persists timeline as gantt because the column is a postgres enum without a timeline value", () => {
    expect(toSavedViewLayout("timeline")).toBe("gantt");
  });

  it("persists workload as board because the layout enum has no workload value", () => {
    expect(toSavedViewLayout("workload")).toBe("board");
  });

  it("maps every view type onto a layout the backend enum accepts", () => {
    for (const view of VIEW_TYPES) {
      expect(SAVED_VIEW_LAYOUTS).toContain(toSavedViewLayout(view));
    }
  });

  it("round-trips every layout the backend can return into a renderable view type", () => {
    for (const layout of SAVED_VIEW_LAYOUTS) {
      const view: ViewType = parseViewType(layout);
      expect(VIEW_TYPES).toContain(view);
    }
  });

  it("round-trips every non-collapsing view type through persistence unchanged", () => {
    for (const view of VIEW_TYPES) {
      if (view === "workload") continue;
      expect(parseViewType(toSavedViewLayout(view))).toBe(view);
    }
  });
});
