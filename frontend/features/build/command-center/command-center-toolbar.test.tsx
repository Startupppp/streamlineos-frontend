import { act, renderHook } from "@testing-library/react";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { COMMAND_CENTER_FILTER_DEFINITIONS } from "./command-center-toolbar";

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => currentParams,
}));

function lastUrl(): string {
  return String(replace.mock.calls.at(-1)?.[0] ?? "");
}

function lastParams(): URLSearchParams {
  const url = lastUrl();
  return new URLSearchParams(url.includes("?") ? url.slice(url.indexOf("?") + 1) : "");
}

beforeEach(() => {
  jest.useFakeTimers();
  replace.mockClear();
  currentParams = new URLSearchParams();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("COMMAND_CENTER_FILTER_DEFINITIONS — scope sentinel is mine so assigned-to-me is the default", () => {
  it("value('scope') returns mine when no URL param so the toolbar shows Assigned to me by default", () => {
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    expect(result.current.value("scope")).toBe("mine");
    expect(result.current.isActive("scope")).toBe(false);
  });

  it("setValue('scope', 'all') writes scope=all to the URL so all issues are shown", () => {
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    act(() => result.current.setValue("scope", "all"));
    expect(lastParams().get("scope")).toBe("all");
  });

  it("setValue('scope', 'mine') clears the scope param so the URL stays clean at the default", () => {
    currentParams = new URLSearchParams("scope=all");
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    act(() => result.current.setValue("scope", "mine"));
    expect(lastUrl()).not.toContain("scope=");
  });

  it("setValue('scope', 'created') writes scope=created to the URL", () => {
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    act(() => result.current.setValue("scope", "created"));
    expect(lastParams().get("scope")).toBe("created");
  });
});

describe("COMMAND_CENTER_FILTER_DEFINITIONS — due filter writes date-window shorthand to URL", () => {
  it("setValue('due', 'overdue') writes due=overdue to the URL", () => {
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    act(() => result.current.setValue("due", "overdue"));
    expect(lastParams().get("due")).toBe("overdue");
  });

  it("setValue('due', 'all') clears the due param when the user resets to any date", () => {
    currentParams = new URLSearchParams("due=overdue");
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    act(() => result.current.setValue("due", "all"));
    expect(lastUrl()).not.toContain("due=");
  });

  it("value('due') returns all (sentinel) when no due param is set", () => {
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    expect(result.current.value("due")).toBe("all");
    expect(result.current.isActive("due")).toBe(false);
  });
});

describe("COMMAND_CENTER_FILTER_DEFINITIONS — owner filter writes user-id to URL", () => {
  it("setValue('owner', 'user-abc') writes owner=user-abc to the URL", () => {
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    act(() => result.current.setValue("owner", "user-abc"));
    expect(lastParams().get("owner")).toBe("user-abc");
  });

  it("clearAll removes scope, owner and due params in one navigation", () => {
    currentParams = new URLSearchParams("scope=all&owner=user-abc&due=overdue");
    const { result } = renderHook(() =>
      useBuildListFilters({ withSearch: false, filters: COMMAND_CENTER_FILTER_DEFINITIONS }),
    );
    act(() => result.current.clearAll());
    const params = lastParams();
    expect(params.has("scope")).toBe(false);
    expect(params.has("owner")).toBe(false);
    expect(params.has("due")).toBe(false);
  });
});
