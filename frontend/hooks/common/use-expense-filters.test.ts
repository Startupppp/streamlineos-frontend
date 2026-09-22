import { renderHook, act } from "@testing-library/react";
import { useExpenseFilters } from "./use-expense-filters";

const mockReplace = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/hr/expenses",
}));

function paramsFrom(call: jest.Mock, index = 0): URLSearchParams {
  const url = call.mock.calls[index][0] as string;
  return new URLSearchParams(url.split("?")[1] ?? "");
}

describe("useExpenseFilters", () => {
  beforeEach(() => {
    mockSearch = "";
    mockReplace.mockClear();
    jest.spyOn(globalThis, "queueMicrotask").mockImplementation((fn) => {
      (fn as VoidFunction)();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("syncToUrl: false (default)", () => {
    it("does not write to the URL when filters are reset", () => {
      const { result } = renderHook(() => useExpenseFilters());
      act(() => {
        result.current.resetFilters();
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("does not write to the URL after a filter change", () => {
      const { result } = renderHook(() => useExpenseFilters());
      act(() => {
        result.current.setFilter("status", "pending");
      });
      expect(result.current.filters.status).toBe("pending");
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("syncToUrl: true — serialization", () => {
    it("serializes a non-default status value", () => {
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.setFilter("status", "pending");
      });
      expect(mockReplace).toHaveBeenCalled();
      expect(paramsFrom(mockReplace).get("status")).toBe("pending");
    });

    it("omits status from the URL when its value is 'all'", () => {
      mockSearch = "status=pending";
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.setFilter("status", "all");
      });
      expect(mockReplace).toHaveBeenCalled();
      expect(paramsFrom(mockReplace).get("status")).toBeNull();
    });

    it("serializes a non-default paymentMethod value", () => {
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.setFilter("paymentMethod", "card");
      });
      expect(mockReplace).toHaveBeenCalled();
      expect(paramsFrom(mockReplace).get("paymentMethod")).toBe("card");
    });

    it("omits paymentMethod from the URL when its value is 'all'", () => {
      mockSearch = "paymentMethod=card";
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.setFilter("paymentMethod", "all");
      });
      expect(mockReplace).toHaveBeenCalled();
      expect(paramsFrom(mockReplace).get("paymentMethod")).toBeNull();
    });

    it("omits page from the URL when page is 1", () => {
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.resetFilters();
      });
      expect(mockReplace).toHaveBeenCalled();
      expect(paramsFrom(mockReplace).get("page")).toBeNull();
    });

    it("serializes page when it is greater than 1", () => {
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.setFilter("page", 2);
      });
      expect(mockReplace).toHaveBeenCalled();
      expect(paramsFrom(mockReplace).get("page")).toBe("2");
    });

    it("serializes search, category, startDate, endDate, minAmount, maxAmount", () => {
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.setFilters({
          search: "lunch",
          category: "food",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          minAmount: 10,
          maxAmount: 100,
        });
      });
      expect(mockReplace).toHaveBeenCalled();
      const p = paramsFrom(mockReplace);
      expect(p.get("search")).toBe("lunch");
      expect(p.get("category")).toBe("food");
      expect(p.get("startDate")).toBe("2024-01-01");
      expect(p.get("endDate")).toBe("2024-01-31");
      expect(p.get("minAmount")).toBe("10");
      expect(p.get("maxAmount")).toBe("100");
    });

    it("omits search, category, startDate, endDate, minAmount, maxAmount when absent", () => {
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.resetFilters();
      });
      expect(mockReplace).toHaveBeenCalled();
      const p = paramsFrom(mockReplace);
      expect(p.get("search")).toBeNull();
      expect(p.get("category")).toBeNull();
      expect(p.get("startDate")).toBeNull();
      expect(p.get("endDate")).toBeNull();
      expect(p.get("minAmount")).toBeNull();
      expect(p.get("maxAmount")).toBeNull();
    });

    it("preserves URL params that are not expense filter params", () => {
      mockSearch = "tab=overview";
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.resetFilters();
      });
      expect(mockReplace).toHaveBeenCalled();
      expect(paramsFrom(mockReplace).get("tab")).toBe("overview");
    });
  });

  describe("filter state", () => {
    it("resets page to 1 when a non-page filter changes", () => {
      mockSearch = "page=3";
      const { result } = renderHook(() => useExpenseFilters({ syncToUrl: true }));
      act(() => {
        result.current.setFilter("status", "pending");
      });
      expect(result.current.filters.page).toBe(1);
    });

    it("does not reset page when the page filter itself changes", () => {
      const { result } = renderHook(() => useExpenseFilters());
      act(() => {
        result.current.setFilter("page", 5);
      });
      expect(result.current.filters.page).toBe(5);
    });

    it("tracks hasActiveFilters correctly", () => {
      const { result } = renderHook(() => useExpenseFilters());
      expect(result.current.hasActiveFilters).toBe(false);
      act(() => {
        result.current.setFilter("status", "pending");
      });
      expect(result.current.hasActiveFilters).toBe(true);
    });
  });
});
