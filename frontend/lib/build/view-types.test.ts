import { parseBoardPageView } from "./view-types";

describe("parseBoardPageView — ?view= values that the issues board does not render fall back to board", () => {
  it("resolves view=calendar to board without throwing", () => {
    expect(parseBoardPageView("calendar")).toBe("board");
  });

  it("resolves an arbitrary unknown view value to board without throwing", () => {
    expect(parseBoardPageView("garbage")).toBe("board");
  });

  it("passes board through unchanged", () => {
    expect(parseBoardPageView("board")).toBe("board");
  });

  it("passes list through unchanged", () => {
    expect(parseBoardPageView("list")).toBe("list");
  });

  it("passes table through unchanged", () => {
    expect(parseBoardPageView("table")).toBe("table");
  });

  it("passes timeline through unchanged", () => {
    expect(parseBoardPageView("timeline")).toBe("timeline");
  });

  it("passes workload through unchanged", () => {
    expect(parseBoardPageView("workload")).toBe("workload");
  });

  it("maps null to board (no view param)", () => {
    expect(parseBoardPageView(null)).toBe("board");
  });
});
