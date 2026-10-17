import { act, renderHook } from "@testing-library/react";
import { useCalendarAccountFilters } from "./use-calendar-account-filters";

const push = jest.fn();
let params = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => params,
}));

jest.mock("@/lib/org-scoped-storage", () => ({
  useOrgStorageScope: () => "org-1:user-1",
  orgScopedStorageKey: (name: string, scope: string) => `${scope}:${name}`,
}));

beforeEach(() => {
  push.mockReset();
  params = new URLSearchParams();
  window.localStorage.clear();
});

describe("useCalendarAccountFilters URL state", () => {
  it("uses URL account filters ahead of stored defaults", () => {
    window.localStorage.setItem(
      "org-1:user-1:streamlineos.calendar.hiddenConnectionIds",
      "[99]",
    );
    params = new URLSearchParams("hiddenAccounts=4,7");

    const { result } = renderHook(() => useCalendarAccountFilters());

    expect(result.current.hiddenIds).toEqual([4, 7]);
  });

  it("updates the URL without dropping date or saved-filter state", () => {
    params = new URLSearchParams("date=2026-04-03&filter=mine&hiddenAccounts=4");
    const { result } = renderHook(() => useCalendarAccountFilters());

    act(() => result.current.toggleConnection(7));

    expect(push).toHaveBeenCalledWith(
      "/calendar?date=2026-04-03&filter=mine&hiddenAccounts=4%2C7",
    );
    expect(window.localStorage.getItem(
      "org-1:user-1:streamlineos.calendar.hiddenConnectionIds",
    )).toBe("[4,7]");
  });
});
