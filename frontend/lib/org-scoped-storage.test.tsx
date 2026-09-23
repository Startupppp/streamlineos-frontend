import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  OrgStorageScopeProvider,
  UNSCOPED,
  orgScopedStorageKey,
} from "./org-scoped-storage";
import { useCalendarAccountFilters } from "@/features/calendar/use-calendar-account-filters";
import { useBuildNavPins } from "@/features/build/navigation/use-build-nav-preferences";

const SCOPE_A = "authenticated:test-org-a:test-user-1";
const SCOPE_B = "authenticated:test-org-b:test-user-1";

function wrapWith(scope: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <OrgStorageScopeProvider scope={scope}>{children}</OrgStorageScopeProvider>
    );
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("orgScopedStorageKey", () => {
  it("produces different keys for different scopes", () => {
    expect(orgScopedStorageKey("my-name", SCOPE_A)).not.toBe(
      orgScopedStorageKey("my-name", SCOPE_B),
    );
  });

  it("embeds both scope and name in the result", () => {
    const k = orgScopedStorageKey("my-name", SCOPE_A);
    expect(k).toContain(SCOPE_A);
    expect(k).toContain("my-name");
  });

  it("UNSCOPED constant matches the fallback scope string", () => {
    expect(typeof UNSCOPED).toBe("string");
    expect(UNSCOPED.length).toBeGreaterThan(0);
  });
});

describe("useCalendarAccountFilters — cross-org isolation", () => {
  it("value written under Org A is invisible under Org B", () => {
    const { result: resultA } = renderHook(() => useCalendarAccountFilters(), {
      wrapper: wrapWith(SCOPE_A),
    });

    act(() => {
      resultA.current.toggleConnection(42);
    });
    expect(resultA.current.hiddenIds).toContain(42);

    const { result: resultB } = renderHook(() => useCalendarAccountFilters(), {
      wrapper: wrapWith(SCOPE_B),
    });
    expect(resultB.current.hiddenIds).not.toContain(42);
  });

  it("module-level cache does not leak: Org B starts with default after Org A writes", () => {
    const { result: resultA, unmount: unmountA } = renderHook(
      () => useCalendarAccountFilters(),
      { wrapper: wrapWith(SCOPE_A) },
    );

    act(() => {
      resultA.current.toggleConnection(99);
    });
    expect(resultA.current.hiddenIds).toContain(99);
    unmountA();

    const { result: resultB } = renderHook(() => useCalendarAccountFilters(), {
      wrapper: wrapWith(SCOPE_B),
    });
    expect(resultB.current.hiddenIds).toHaveLength(0);
  });
});

const PIN_SCOPE_TOOL_IDS = ["project-triage", "project-analytics"];

describe("useBuildNavPins — cross-org isolation", () => {
  it("value written under Org A is invisible under Org B", () => {
    const { result: resultA } = renderHook(
      () => useBuildNavPins(PIN_SCOPE_TOOL_IDS, false),
      { wrapper: wrapWith(SCOPE_A) },
    );

    act(() => {
      resultA.current.togglePin("project-triage");
    });
    expect(resultA.current.isPinned("project-triage")).toBe(true);

    const { result: resultB } = renderHook(
      () => useBuildNavPins(PIN_SCOPE_TOOL_IDS, false),
      { wrapper: wrapWith(SCOPE_B) },
    );
    expect(resultB.current.isPinned("project-triage")).toBe(false);
  });

  it("module-level cache does not leak: Org B returns default after Org A writes", () => {
    const { result: resultA, unmount: unmountA } = renderHook(
      () => useBuildNavPins(PIN_SCOPE_TOOL_IDS, false),
      { wrapper: wrapWith(SCOPE_A) },
    );

    act(() => {
      resultA.current.togglePin("project-analytics");
    });
    expect(resultA.current.isPinned("project-analytics")).toBe(true);
    unmountA();

    const { result: resultB } = renderHook(
      () => useBuildNavPins(PIN_SCOPE_TOOL_IDS, false),
      { wrapper: wrapWith(SCOPE_B) },
    );
    expect(resultB.current.isPinned("project-analytics")).toBe(false);
  });
});
