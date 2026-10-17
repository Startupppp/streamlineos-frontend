let mockSearchParams = new URLSearchParams();
let mockPathname = "/build/1/issues";
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => mockPathname,
}));

jest.mock("../shared/use-build-list-url-state", () => ({
  BUILD_LIST_CURSOR_PARAM: "cursor",
  buildListSearchParams: (
    sp: URLSearchParams,
    updates: Record<string, string | null>,
    _opts: unknown,
  ) => {
    const result = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) result.delete(k);
      else result.set(k, v);
    }
    return result;
  },
  parsePriorityParam: (v: string | null) => v ?? "",
  parseTicketTypeParam: (v: string | null) => v ?? "",
}));

jest.mock("@/lib/org-scoped-storage", () => ({
  useOrgStorageScope: () => "testscope",
  orgScopedStorageKey: (name: string, scope: string) => `${scope}::${name}`,
}));

import { renderHook } from "@testing-library/react";
import { useBoardFilterParams } from "./board-filter-params";

const TEST_KEY = "testscope::streamlineos:build:issues-filter:v1:1";

function setUrl(query: string) {
  mockSearchParams = new URLSearchParams(query);
}

describe("filter restore from session storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/build/1/issues";
    setUrl("");
    sessionStorage.clear();
  });

  it("restores a remembered query when arriving at the bare issues URL", () => {
    sessionStorage.setItem(TEST_KEY, "priority=URGENT");
    renderHook(() => useBoardFilterParams());
    expect(mockReplace).toHaveBeenCalledWith(
      "/build/1/issues?priority=URGENT",
      { scroll: false },
    );
  });

  it("does not restore when the URL already carries filter params", () => {
    sessionStorage.setItem(TEST_KEY, "priority=URGENT");
    setUrl("type=BUG");
    renderHook(() => useBoardFilterParams());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not restore when stored state is empty string (written by Clear)", () => {
    sessionStorage.setItem(TEST_KEY, "");
    renderHook(() => useBoardFilterParams());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not restore when no query has ever been stored", () => {
    renderHook(() => useBoardFilterParams());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not restore on a non-issues path even when storage has a query", () => {
    sessionStorage.setItem(TEST_KEY, "priority=URGENT");
    mockPathname = "/build/1";
    renderHook(() => useBoardFilterParams());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("filter save to session storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/build/1/issues";
    setUrl("");
    sessionStorage.clear();
  });

  it("saves active filter params on first arrival at the issues page", () => {
    setUrl("priority=URGENT");
    renderHook(() => useBoardFilterParams());
    expect(sessionStorage.getItem(TEST_KEY)).toBe("priority=URGENT");
  });

  it("saves multiple active filter params together", () => {
    setUrl("priority=URGENT&type=BUG");
    renderHook(() => useBoardFilterParams());
    const stored = new URLSearchParams(sessionStorage.getItem(TEST_KEY) ?? "");
    expect(stored.get("priority")).toBe("URGENT");
    expect(stored.get("type")).toBe("BUG");
  });

  it("does not save non-filter params such as cursor", () => {
    setUrl("cursor=c-900");
    renderHook(() => useBoardFilterParams());
    expect(sessionStorage.getItem(TEST_KEY)).toBeNull();
  });

  it("saves an empty string when all filters are cleared (Clear writes cleared state)", () => {
    setUrl("priority=URGENT");
    const { rerender } = renderHook(() => useBoardFilterParams());
    setUrl("");
    rerender();
    expect(sessionStorage.getItem(TEST_KEY)).toBe("");
  });

  it("does not restore after Clear even when navigating away and back", () => {
    setUrl("priority=URGENT");
    const { rerender } = renderHook(() => useBoardFilterParams());
    setUrl("");
    rerender();
    expect(sessionStorage.getItem(TEST_KEY)).toBe("");

    mockPathname = "/build/1";
    rerender();

    mockReplace.mockClear();
    mockPathname = "/build/1/issues";
    rerender();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not write to storage while on a non-issues path", () => {
    mockPathname = "/build/1";
    setUrl("priority=URGENT");
    renderHook(() => useBoardFilterParams());
    expect(sessionStorage.getItem(TEST_KEY)).toBeNull();
  });
});
