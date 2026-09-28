import {
  applyDisplayOptionParams,
  orderDirectionFor,
  readOrderBy,
  writeDisplayOptionParams,
} from "./use-display-options";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-panel";
import { parseBoardOrderBy, parseBoardOrderDir } from "./board-filter-params";

describe("one orderBy key, two spellings of the same order", () => {
  it("reads the display panel's manual order as the read endpoint's rank order", () => {
    expect(parseBoardOrderBy("manual")).toBe("rank");
  });

  it("reads the endpoint's rank order back as the panel's manual order", () => {
    expect(readOrderBy("rank", "created")).toBe("manual");
  });

  it("keeps a shared spelling on both sides rather than aliasing everything", () => {
    expect(parseBoardOrderBy("updated")).toBe("updated");
    expect(readOrderBy("updated", "manual")).toBe("updated");
  });

  it("drops a spelling neither side accepts instead of sending it to the server", () => {
    expect(parseBoardOrderBy("sideways")).toBeUndefined();
    expect(readOrderBy("sideways", "manual")).toBe("manual");
  });

  it("round-trips every panel order through the URL without changing the order it asks for", () => {
    for (const orderBy of ["manual", "created", "updated", "priority", "dueDate"] as const) {
      const params = writeDisplayOptionParams(new URLSearchParams(), {
        ...DEFAULT_DISPLAY_OPTIONS,
        orderBy,
      });
      expect(readOrderBy(params.get("orderBy"), "created")).toBe(orderBy);
    }
  });
});

describe("orderDir has a writer", () => {
  it("writes a direction alongside every order the panel writes", () => {
    const params = writeDisplayOptionParams(new URLSearchParams(), {
      ...DEFAULT_DISPLAY_OPTIONS,
      orderBy: "updated",
    });
    expect(params.get("orderDir")).toBe("desc");
    expect(parseBoardOrderDir(params.get("orderDir"))).toBe("desc");
  });

  it("orders the manual rank ascending, because rank ascends down the list", () => {
    expect(orderDirectionFor("manual")).toBe("asc");
  });

  it("orders due dates ascending, so the soonest deadline is first", () => {
    expect(orderDirectionFor("dueDate")).toBe("asc");
  });

  it("orders recency and priority descending, so the newest and the most urgent are first", () => {
    expect(orderDirectionFor("created")).toBe("desc");
    expect(orderDirectionFor("updated")).toBe("desc");
    expect(orderDirectionFor("priority")).toBe("desc");
  });

  it("writes a direction the read endpoint accepts for every order the panel offers", () => {
    for (const orderBy of ["manual", "created", "updated", "priority", "dueDate"] as const) {
      const params = writeDisplayOptionParams(new URLSearchParams(), {
        ...DEFAULT_DISPLAY_OPTIONS,
        orderBy,
      });
      expect(parseBoardOrderDir(params.get("orderDir"))).toBe(orderDirectionFor(orderBy));
    }
  });
});

describe("a deep-linked order survives the panel reading it", () => {
  it("keeps a deep-linked updated order rather than coercing it to the stored default", () => {
    const options = applyDisplayOptionParams(
      { ...DEFAULT_DISPLAY_OPTIONS, orderBy: "manual" },
      new URLSearchParams("orderBy=updated"),
    );
    expect(options.orderBy).toBe("updated");
  });

  it("keeps a deep-linked rank order as the manual order rather than falling back", () => {
    const options = applyDisplayOptionParams(
      { ...DEFAULT_DISPLAY_OPTIONS, orderBy: "updated" },
      new URLSearchParams("orderBy=rank"),
    );
    expect(options.orderBy).toBe("manual");
  });
});
