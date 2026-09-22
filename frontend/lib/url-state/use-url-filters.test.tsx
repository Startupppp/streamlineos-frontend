import { renderHook, act } from "@testing-library/react";
import { useUrlFilters, parseEnum } from "./use-url-filters";

const mockReplace = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/test",
}));

function extractParams(call: jest.MockedFunction<typeof mockReplace>): URLSearchParams {
  const url = call.mock.calls[0][0] as string;
  return new URLSearchParams(url.split("?")[1] ?? "");
}

describe("useUrlFilters", () => {
  beforeEach(() => {
    mockSearch = "";
    mockReplace.mockClear();
  });

  describe("update — URL patching", () => {
    it("sets a param and preserves existing ones", () => {
      mockSearch = "status=active";
      const { result } = renderHook(() => useUrlFilters());
      act(() => {
        result.current.update({ view: "kanban" });
      });
      const params = extractParams(mockReplace);
      expect(params.get("view")).toBe("kanban");
      expect(params.get("status")).toBe("active");
    });

    it("removes a param when its value is null", () => {
      mockSearch = "status=active&view=table";
      const { result } = renderHook(() => useUrlFilters());
      act(() => {
        result.current.update({ status: null });
      });
      const params = extractParams(mockReplace);
      expect(params.get("status")).toBeNull();
      expect(params.get("view")).toBe("table");
    });

    it("removes a param when its value is an empty string", () => {
      mockSearch = "q=hello";
      const { result } = renderHook(() => useUrlFilters());
      act(() => {
        result.current.update({ q: "" });
      });
      const params = extractParams(mockReplace);
      expect(params.get("q")).toBeNull();
    });

    it("calls router.replace with scroll: false", () => {
      const { result } = renderHook(() => useUrlFilters());
      act(() => {
        result.current.update({ q: "test" });
      });
      expect(mockReplace).toHaveBeenCalledWith(expect.any(String), { scroll: false });
    });
  });

  describe("pagination reset", () => {
    it("resets the page param when a non-page filter changes", () => {
      mockSearch = "page=3&status=active";
      const { result } = renderHook(() => useUrlFilters({ pageParam: "page" }));
      act(() => {
        result.current.update({ status: "closed" });
      });
      const params = extractParams(mockReplace);
      expect(params.get("page")).toBeNull();
      expect(params.get("status")).toBe("closed");
    });

    it("does not reset the page when the update explicitly sets the page", () => {
      mockSearch = "page=3&status=active";
      const { result } = renderHook(() => useUrlFilters({ pageParam: "page" }));
      act(() => {
        result.current.update({ page: "2" });
      });
      const params = extractParams(mockReplace);
      expect(params.get("page")).toBe("2");
    });

    it("does not reset the page when pageParam is not configured", () => {
      mockSearch = "page=3&status=active";
      const { result } = renderHook(() => useUrlFilters());
      act(() => {
        result.current.update({ status: "closed" });
      });
      const params = extractParams(mockReplace);
      expect(params.get("page")).toBe("3");
    });

    it("resets the page even when the current URL has no page param", () => {
      mockSearch = "status=active";
      const { result } = renderHook(() => useUrlFilters({ pageParam: "page" }));
      act(() => {
        result.current.update({ status: "closed" });
      });
      const params = extractParams(mockReplace);
      expect(params.get("page")).toBeNull();
    });
  });
});

describe("parseEnum", () => {
  const OPTIONS = ["table", "kanban", "funnel"] as const;

  it("returns the matching value from the tuple", () => {
    expect(parseEnum("kanban", OPTIONS, "table")).toBe("kanban");
  });

  it("returns the fallback for an unrecognised value", () => {
    expect(parseEnum("nonsense", OPTIONS, "table")).toBe("table");
  });

  it("returns the fallback for null", () => {
    expect(parseEnum(null, OPTIONS, "table")).toBe("table");
  });

  it("handles every member of the tuple", () => {
    for (const option of OPTIONS) {
      expect(parseEnum(option, OPTIONS, "table")).toBe(option);
    }
  });
});
