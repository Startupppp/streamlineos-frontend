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
  it("defaults to section=UNREAD when no params are present", () => {
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.section).toBe("UNREAD");
  });

  it("reads section=MENTIONS from the URL", () => {
    mockSearchParams = new URLSearchParams("section=MENTIONS");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.section).toBe("MENTIONS");
  });

  it("reads view=drafts from the URL", () => {
    mockSearchParams = new URLSearchParams("view=drafts");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.view).toBe("drafts");
  });

  it("defaults view to notifications when absent", () => {
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.view).toBe("notifications");
  });

  it("reads q from the URL", () => {
    mockSearchParams = new URLSearchParams("q=assignment");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.q).toBe("assignment");
  });

  it("reads cursor from the URL", () => {
    mockSearchParams = new URLSearchParams("cursor=42");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.cursor).toBe("42");
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

  it("clearFilters removes q, type, and cursor but keeps view", () => {
    mockSearchParams = new URLSearchParams("view=drafts&q=foo&type=PROJECTS&cursor=5");
    const { result } = renderHook(() => useInboxUrlState());
    act(() => {
      result.current.clearFilters();
    });
    const url = replace.mock.calls[0][0];
    expect(url).toContain("view=drafts");
    expect(url).not.toContain("q=");
    expect(url).not.toContain("type=");
    expect(url).not.toContain("cursor=");
  });

  it("hasActiveFilters is true when q is set", () => {
    mockSearchParams = new URLSearchParams("q=bug");
    const { result } = renderHook(() => useInboxUrlState());
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("hasActiveFilters is false when only view and section are set", () => {
    mockSearchParams = new URLSearchParams("view=drafts&section=ALL");
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
