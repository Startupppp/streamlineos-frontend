import { renderHook, act } from "@testing-library/react";
import { useLeadsFilters } from "./use-leads-filters";

const mockReplace = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/crm/leads",
}));

function paramsFrom(call: jest.Mock, index = 0): URLSearchParams {
  const url = call.mock.calls[index][0] as string;
  return new URLSearchParams(url.split("?")[1] ?? "");
}

describe("useLeadsFilters", () => {
  beforeEach(() => {
    mockSearch = "";
    mockReplace.mockClear();
  });

  describe("URL → state: view parsing", () => {
    it("defaults to table view when the view param is absent", () => {
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.view).toBe("table");
    });

    it("parses the kanban view param", () => {
      mockSearch = "view=kanban";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.view).toBe("kanban");
    });

    it("parses the funnel view param", () => {
      mockSearch = "view=funnel";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.view).toBe("funnel");
    });

    it("falls back to table for an unrecognised view value", () => {
      mockSearch = "view=nonsense";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.view).toBe("table");
    });
  });

  describe("URL → state: sort parsing", () => {
    it("defaults to desc sort direction", () => {
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.sortDirection).toBe("desc");
    });

    it("parses the asc sort direction", () => {
      mockSearch = "order=asc";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.sortDirection).toBe("asc");
    });

    it("falls back to desc for an unrecognised order value", () => {
      mockSearch = "order=bogus";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.sortDirection).toBe("desc");
    });

    it("defaults sortColumn to createdAt", () => {
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.sortColumn).toBe("createdAt");
    });

    it("reads sortColumn from the sortBy param", () => {
      mockSearch = "sortBy=name";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.sortColumn).toBe("name");
    });
  });

  describe("URL → state: pagination", () => {
    it("defaults to pageSize 50", () => {
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.pageSize).toBe(50);
    });

    it("reads pageSize from the size param", () => {
      mockSearch = "size=100";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.pageSize).toBe(100);
    });
  });

  describe("URL → state: optional filters", () => {
    it("returns undefined for absent optional filters", () => {
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.statusFilter).toBeUndefined();
      expect(result.current.priorityFilter).toBeUndefined();
      expect(result.current.sourceFilter).toBeUndefined();
    });

    it("parses optional filters when present", () => {
      mockSearch = "status=active&priority=high&source=web";
      const { result } = renderHook(() => useLeadsFilters());
      expect(result.current.statusFilter).toBe("active");
      expect(result.current.priorityFilter).toBe("high");
      expect(result.current.sourceFilter).toBe("web");
    });
  });

  describe("setters — exact param keys written to the URL", () => {
    it("setSearchQuery writes the q param", () => {
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setSearchQuery("hello");
      });
      expect(paramsFrom(mockReplace).get("q")).toBe("hello");
    });

    it("setSearchQuery with an empty string deletes the q param", () => {
      mockSearch = "q=hello";
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setSearchQuery("");
      });
      expect(paramsFrom(mockReplace).get("q")).toBeNull();
    });

    it("setStatusFilter writes the status param", () => {
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setStatusFilter("active");
      });
      expect(paramsFrom(mockReplace).get("status")).toBe("active");
    });

    it("setStatusFilter with undefined deletes the status param", () => {
      mockSearch = "status=active";
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setStatusFilter(undefined);
      });
      expect(paramsFrom(mockReplace).get("status")).toBeNull();
    });

    it("setPriorityFilter writes the priority param", () => {
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setPriorityFilter("high");
      });
      expect(paramsFrom(mockReplace).get("priority")).toBe("high");
    });

    it("setSourceFilter writes the source param", () => {
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setSourceFilter("web");
      });
      expect(paramsFrom(mockReplace).get("source")).toBe("web");
    });

    it("setSort writes the sortBy and order params", () => {
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setSort("name", "asc");
      });
      const p = paramsFrom(mockReplace);
      expect(p.get("sortBy")).toBe("name");
      expect(p.get("order")).toBe("asc");
    });

    it("setPageSize writes the size param", () => {
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.setPageSize(100);
      });
      expect(paramsFrom(mockReplace).get("size")).toBe("100");
    });

    it("clearFilters deletes status, priority, source and q", () => {
      mockSearch = "status=active&priority=high&source=web&q=hello&view=kanban";
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.clearFilters();
      });
      const p = paramsFrom(mockReplace);
      expect(p.get("status")).toBeNull();
      expect(p.get("priority")).toBeNull();
      expect(p.get("source")).toBeNull();
      expect(p.get("q")).toBeNull();
    });

    it("clearFilters leaves other params intact", () => {
      mockSearch = "status=active&view=kanban&size=100";
      const { result } = renderHook(() => useLeadsFilters());
      act(() => {
        result.current.clearFilters();
      });
      const p = paramsFrom(mockReplace);
      expect(p.get("view")).toBe("kanban");
      expect(p.get("size")).toBe("100");
    });
  });
});
