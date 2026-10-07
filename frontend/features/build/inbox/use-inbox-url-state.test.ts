import { renderHook, act } from "@testing-library/react";
import { useInboxUrlState } from "./use-inbox-url-state";

const replace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/build/inbox",
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
});

describe("useInboxUrlState — param round-trips", () => {
  it.each(["SNOOZED", "ARCHIVED"])("preserves %s and unrelated facets while dropping the cursor", (section) => {
    mockSearchParams = new URLSearchParams(`section=${section}&q=bug&type=PROJECTS&projectId=54&cursor=42&panel=preview`);
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.section).toBe(section);
    act(() => { result.current.setParams({ section: "ALL" }); });
    expect(replace.mock.calls[0][0]).toBe("/build/inbox?section=ALL&q=bug&type=PROJECTS&projectId=54&panel=preview");
  });
  it("defaults to the active section when no params are present", () => {
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.section).toBe("ALL");
  });

  it("reads section=MENTIONS from the URL", () => {
    mockSearchParams = new URLSearchParams("section=MENTIONS");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.section).toBe("MENTIONS");
  });

  it("reads q from the URL", () => {
    mockSearchParams = new URLSearchParams("q=assignment");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.q).toBe("assignment");
  });

  it("reads cursor from the URL", () => {
    mockSearchParams = new URLSearchParams("cursor=42");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.cursor).toBe(42);
  });

  it("ignores a malformed or non-positive cursor", () => {
    for (const value of ["0", "-1", "1.5", "not-a-cursor"]) {
      mockSearchParams = new URLSearchParams(`cursor=${value}`);
      const { result } = renderHook(() => useInboxUrlState());
      expect(result.current.cursor).toBeNull();
    }
  });

  it("setParams with section clears cursor", () => {
    mockSearchParams = new URLSearchParams("cursor=99&section=ALL");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ section: "MENTIONS" });
    });
    const url = replace.mock.calls[0][0];
    expect(url).not.toContain("cursor=");
    expect(url).toContain("section=MENTIONS");
  });

  it("setParams with q clears cursor", () => {
    mockSearchParams = new URLSearchParams("cursor=10");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ q: "ticket" });
    });
    const url = replace.mock.calls[0][0];
    expect(url).not.toContain("cursor=");
    expect(url).toContain("q=ticket");
  });

  it("setParams with only cursor keeps the cursor so pagination can advance", () => {
    mockSearchParams = new URLSearchParams("section=ALL");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ cursor: "88" });
    });
    const url = replace.mock.calls[0][0];
    expect(url).toContain("cursor=88");
  });

  it("clearFilters removes q, type, and cursor but keeps section", () => {
    mockSearchParams = new URLSearchParams("section=ALL&q=foo&type=PROJECTS&cursor=5");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.clearFilters();
    });
    const url = replace.mock.calls[0][0];
    expect(url).toContain("section=ALL");
    expect(url).not.toContain("q=");
    expect(url).not.toContain("type=");
    expect(url).not.toContain("cursor=");
  });

  it("hasActiveFilters is true when q is set", () => {
    mockSearchParams = new URLSearchParams("q=bug");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("hasActiveFilters is false when only section is set", () => {
    mockSearchParams = new URLSearchParams("section=ALL");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("a shared link with section=MENTIONS reproduces the Mentions view", () => {
    mockSearchParams = new URLSearchParams("section=MENTIONS&q=deploy");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.section).toBe("MENTIONS");
    expect(result.current.q).toBe("deploy");
  });

  it("ignores an unknown section value and defaults to UNREAD", () => {
    mockSearchParams = new URLSearchParams("section=BOGUS");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.section).toBe("UNREAD");
  });

  it("setParams with null value removes the param", () => {
    mockSearchParams = new URLSearchParams("q=foo");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ q: null });
    });
    const url = replace.mock.calls[0][0];
    expect(url).not.toContain("q=");
  });
});

describe("useInboxUrlState — projectId param matches the spec URL name", () => {
  it("reads projectId from the URL and parses it as a positive integer", () => {
    mockSearchParams = new URLSearchParams("projectId=42");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.projectId).toBe(42);
  });

  it("ignores the legacy project param — renamed to projectId to match the spec", () => {
    mockSearchParams = new URLSearchParams("project=7");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.projectId).toBeNull();
  });

  it("hasActiveFilters is true when projectId is set", () => {
    mockSearchParams = new URLSearchParams("projectId=5");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("clearFilters removes projectId so the filter resets", () => {
    mockSearchParams = new URLSearchParams("projectId=3&q=foo");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.clearFilters();
    });
    const url = replace.mock.calls[0][0];
    expect(url).not.toContain("projectId=");
    expect(url).not.toContain("q=");
  });

  it("setParams with null for projectId removes the param", () => {
    mockSearchParams = new URLSearchParams("projectId=10");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ projectId: null });
    });
    const url = replace.mock.calls[0][0];
    expect(url).not.toContain("projectId=");
  });

  it("ignores a non-positive projectId value", () => {
    mockSearchParams = new URLSearchParams("projectId=0");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.projectId).toBeNull();
  });
});

describe("useInboxUrlState — type param validation", () => {
  it("a valid category round-trips through parseType", () => {
    mockSearchParams = new URLSearchParams("type=PROJECTS");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.type).toBe("PROJECTS");
  });

  it("an invalid category is dropped and type returns null", () => {
    mockSearchParams = new URLSearchParams("type=BOGUS_CATEGORY");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.type).toBeNull();
  });

  it("Build workflow approvals also round-trip", () => {
    mockSearchParams = new URLSearchParams("type=WORKFLOW");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.type).toBe("WORKFLOW");
  });

  it.each(["SECURITY", "BILLING", "HRMS", "CRM", "AI"])("ignores the unrelated global category %s in an old shared link", (category) => {
    mockSearchParams = new URLSearchParams(`type=${category}`);
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.type).toBeNull();
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("setParams with a category value writes it to the URL", () => {
    mockSearchParams = new URLSearchParams();
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ type: "WORKFLOW" });
    });
    const url = replace.mock.calls[0][0];
    expect(url).toContain("type=WORKFLOW");
  });

  it("removes unsupported category parameters when writing the next URL", () => {
    mockSearchParams = new URLSearchParams("type=CRM&section=ALL&cursor=5");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => { result.current.setParams({ q: "release" }); });
    expect(replace).toHaveBeenCalledWith("/build/inbox?section=ALL&q=release", { scroll: false });
  });

  it("setParams with null for type removes the param (All types selection)", () => {
    mockSearchParams = new URLSearchParams("type=PROJECTS");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ type: null });
    });
    const url = replace.mock.calls[0][0];
    expect(url).not.toContain("type=");
  });

  it("setParams with type clears cursor so pagination resets", () => {
    mockSearchParams = new URLSearchParams("type=BILLING&cursor=55");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.setParams({ type: "PROJECTS" });
    });
    const url = replace.mock.calls[0][0];
    expect(url).toContain("type=PROJECTS");
    expect(url).not.toContain("cursor=");
  });

  it("hasActiveFilters is true when a valid type is set", () => {
    mockSearchParams = new URLSearchParams("type=WORKFLOW");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("hasActiveFilters is false when type is invalid (it is dropped)", () => {
    mockSearchParams = new URLSearchParams("type=NOT_A_REAL_CATEGORY");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.type).toBeNull();
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it("clearFilters removes a set type and returns type as null", () => {
    mockSearchParams = new URLSearchParams("type=PROJECTS");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.clearFilters();
    });
    const url = replace.mock.calls[0][0];
    expect(url).not.toContain("type=");
  });
});
