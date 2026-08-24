import { act, renderHook } from "@testing-library/react";
import type { ListFilterSpec } from "./list-filter-spec";
import { useListFilterParams } from "./use-list-filter-params";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/payroll/runs",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

/**
 * Deliberately not a ticket list. The point of the spec-driven interface is that
 * a page with different vocabulary and different parameter names needs no code
 * in the hook, so the test that proves it must not be Build-shaped.
 */
const PAYROLL_RUN_SPEC: ListFilterSpec = {
  categories: [
    { key: "state", label: "State", arity: "multi", params: ["runState"] },
    { key: "cycle", label: "Pay cycle", arity: "single", params: ["payCycleId"] },
    {
      key: "period",
      label: "Period",
      arity: "range",
      params: ["periodFrom", "periodTo"],
    },
  ],
  searchParam: "search",
  pageParam: "offset",
};

function lastParams(): URLSearchParams {
  const url = String(mockReplace.mock.calls.at(-1)?.[0] ?? "");
  return new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
}

function renderWith(query: string) {
  mockSearchParams = new URLSearchParams(query);
  return renderHook(() => useListFilterParams(PAYROLL_RUN_SPEC));
}

describe("list filter params, driven by a spec", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("hydrates every declared category from the URL", () => {
    const { result } = renderWith(
      "runState=DRAFT,PAID&payCycleId=3&periodFrom=2026-01-01&periodTo=2026-01-31",
    );

    expect(result.current.values["state"]).toEqual(["DRAFT", "PAID"]);
    expect(result.current.values["cycle"]).toEqual(["3"]);
    expect(result.current.values["period"]).toEqual(["2026-01-01", "2026-01-31"]);
  });

  it("accumulates a multi-valued category", () => {
    const { result } = renderWith("runState=DRAFT");

    act(() => result.current.toggle("state", "PAID"));

    expect(lastParams().get("runState")).toBe("DRAFT,PAID");
  });

  it("replaces a single-valued category", () => {
    const { result } = renderWith("payCycleId=3");

    act(() => result.current.toggle("cycle", "9"));

    expect(lastParams().get("payCycleId")).toBe("9");
  });

  it("clears a single-valued category when its own value is toggled", () => {
    const { result } = renderWith("payCycleId=3");

    act(() => result.current.toggle("cycle", "3"));

    expect(lastParams().has("payCycleId")).toBe(false);
  });

  it("sets each end of a range independently", () => {
    const { result } = renderWith("periodFrom=2026-01-01");

    act(() => result.current.setAt("period", 1, "2026-01-31"));

    expect(lastParams().get("periodFrom")).toBe("2026-01-01");
    expect(lastParams().get("periodTo")).toBe("2026-01-31");
  });

  it("clears both ends of a range as one unit", () => {
    const { result } = renderWith("periodFrom=2026-01-01&periodTo=2026-01-31");

    act(() => result.current.clearCategory("period"));

    expect(lastParams().has("periodFrom")).toBe(false);
    expect(lastParams().has("periodTo")).toBe(false);
  });

  it("counts a range as one active category", () => {
    const { result } = renderWith("periodFrom=2026-01-01&periodTo=2026-01-31");

    expect(result.current.activeFilterCount).toBe(1);
  });

  it("counts categories rather than selected values", () => {
    const { result } = renderWith("runState=DRAFT,PAID,VOID&payCycleId=3");

    expect(result.current.activeFilterCount).toBe(2);
  });

  it("deletes a parameter rather than writing an empty one", () => {
    const { result } = renderWith("runState=DRAFT");

    act(() => result.current.remove("state", "DRAFT"));

    expect(lastParams().has("runState")).toBe(false);
  });

  it("clears every declared parameter and keeps unrelated state", () => {
    const { result } = renderWith(
      "runState=DRAFT&payCycleId=3&periodFrom=2026-01-01&offset=40&search=ann&view=table",
    );

    act(() => result.current.clearAll());

    const params = lastParams();
    expect(params.has("runState")).toBe(false);
    expect(params.has("payCycleId")).toBe(false);
    expect(params.has("periodFrom")).toBe(false);
    expect(params.has("offset")).toBe(false);
    expect(params.get("search")).toBe("ann");
    expect(params.get("view")).toBe("table");
  });

  it("honours the page parameter this spec declared", () => {
    const { result } = renderWith("runState=DRAFT&offset=40");

    act(() => result.current.toggle("state", "PAID"));

    expect(lastParams().has("offset")).toBe(false);
  });

  it("honours the search parameter this spec declared", () => {
    jest.useFakeTimers();
    const { result } = renderWith("");

    act(() => result.current.setSearch("annual"));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(lastParams().get("search")).toBe("annual");
    expect(lastParams().has("q")).toBe(false);
  });

  it("settles rapid search input into one navigation", () => {
    jest.useFakeTimers();
    const { result } = renderWith("");

    act(() => result.current.setSearch("a"));
    act(() => result.current.setSearch("an"));
    act(() => result.current.setSearch("ann"));
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("reads the current page from the parameter this spec declared", () => {
    const { result } = renderWith("offset=3");

    expect(result.current.page).toBe(3);
  });

  it("treats a missing or unreadable page as the first one", () => {
    expect(renderWith("").result.current.page).toBe(1);
    expect(renderWith("offset=nonsense").result.current.page).toBe(1);
    expect(renderWith("offset=0").result.current.page).toBe(1);
    expect(renderWith("offset=-2").result.current.page).toBe(1);
  });

  it("changing page keeps the filters and the page parameter", () => {
    const { result } = renderWith("runState=DRAFT&offset=2");

    act(() => result.current.setPage(5));

    expect(lastParams().get("offset")).toBe("5");
    expect(lastParams().get("runState")).toBe("DRAFT");
  });

  it("drops the page parameter rather than writing the first page into it", () => {
    const { result } = renderWith("runState=DRAFT&offset=4");

    act(() => result.current.setPage(1));

    expect(lastParams().has("offset")).toBe(false);
    expect(lastParams().get("runState")).toBe("DRAFT");
  });

  it("ignores a category the spec never declared rather than throwing", () => {
    const { result } = renderWith("runState=DRAFT");

    act(() => result.current.toggle("nonexistent", "x"));

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
