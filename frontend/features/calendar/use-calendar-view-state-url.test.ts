import { act, renderHook } from "@testing-library/react";
import { useCalendarViewState } from "./use-calendar-view-state";
import type { BigCalEvent } from "./big-calendar-wrapper";

const push = jest.fn();
const replace = jest.fn();
let params = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => params,
}));

jest.mock("./use-calendar-slot-selection-guard", () => ({
  useCalendarSlotSelectionGuard: (handler: unknown) => handler,
}));

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
  params = new URLSearchParams();
  window.history.replaceState(null, "", "/calendar");
});

describe("useCalendarViewState URL navigation", () => {
  it("derives state from each URL snapshot so back and forward restore the view", () => {
    params = new URLSearchParams(
      "date=2026-04-03&view=month&mode=history&hr=0&historyBefore=2026-04-04T00%3A00%3A00.000Z&historyPages=4",
    );
    const { result, rerender } = renderHook(() => useCalendarViewState());

    expect(result.current.currentDate.getDate()).toBe(3);
    expect(result.current.view).toBe("month");
    expect(result.current.viewMode).toBe("history");
    expect(result.current.hrEventsVisible).toBe(false);
    expect(result.current.historyPages).toBe(4);

    params = new URLSearchParams("date=2026-03-02&view=day&mode=list&crm=0");
    rerender();

    expect(result.current.currentDate.getMonth()).toBe(2);
    expect(result.current.currentDate.getDate()).toBe(2);
    expect(result.current.view).toBe("day");
    expect(result.current.viewMode).toBe("list");
    expect(result.current.crmEventsVisible).toBe(false);
  });

  it("writes date, view, and source filter changes without dropping saved state", () => {
    params = new URLSearchParams("filter=leadership&mode=list");
    const { result } = renderHook(() => useCalendarViewState());

    act(() => result.current.setView("month"));
    expect(push).toHaveBeenLastCalledWith(
      "/calendar?filter=leadership&mode=list&view=month",
    );

    act(() => result.current.setSourceVisibility("attendance", false));
    expect(push).toHaveBeenLastCalledWith(
      "/calendar?filter=leadership&mode=list&attendance=0",
    );

    act(() => result.current.setViewMode("calendar"));
    expect(push).toHaveBeenLastCalledWith(
      "/calendar?mode=calendar",
    );
  });

  it("keeps a selected external item in the URL and removes it safely on close", () => {
    params = new URLSearchParams("mode=history&historyPages=3");
    window.history.replaceState(null, "", `/calendar?${params.toString()}`);
    const { result } = renderHook(() => useCalendarViewState());
    const event: BigCalEvent = {
      id: "external:4:provider-8",
      title: "Old provider event",
      start: new Date("2026-01-01T09:00:00.000Z"),
      end: new Date("2026-01-01T10:00:00.000Z"),
      resource: {
        source: "external",
        sourceFamily: "external",
        actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
      },
    };
    replace.mockClear();

    act(() => result.current.handleSelectEvent(event));
    expect(window.location.pathname + window.location.search).toBe(
      "/calendar?mode=history&historyPages=3&event=external%3A4%3Aprovider-8&eventSource=external",
    );
    expect(push).not.toHaveBeenCalled();

    params = new URLSearchParams(
      "mode=history&historyPages=3&event=external%3A4%3Aprovider-8&eventSource=external",
    );
    act(() => result.current.handleCloseSelected());
    expect(window.location.pathname + window.location.search).toBe(
      "/calendar?mode=history&historyPages=3",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not open a Grid event whose projection denies viewing", () => {
    const { result } = renderHook(() => useCalendarViewState());
    const event: BigCalEvent = {
      id: "restricted",
      title: "Restricted event",
      start: new Date("2026-01-01T09:00:00.000Z"),
      end: new Date("2026-01-01T10:00:00.000Z"),
      resource: {
        source: "event",
        sourceFamily: "calendar",
        actions: { view: false, edit: false, delete: false, rsvp: false, complete: false },
      },
    };

    act(() => result.current.handleSelectEvent(event));

    expect(push).not.toHaveBeenCalled();
  });

  it("accountsOpen is true on the first render when the URL carries ?accounts=1 without waiting for an effect", () => {
    params = new URLSearchParams("accounts=1");
    const { result } = renderHook(() => useCalendarViewState());
    expect(result.current.accountsOpen).toBe(true);
  });

  it("handleCloseAccounts navigates to remove ?accounts=1 and accountsOpen becomes false once the URL updates", () => {
    params = new URLSearchParams("mode=list&accounts=1");
    const { result, rerender } = renderHook(() => useCalendarViewState());
    expect(result.current.accountsOpen).toBe(true);

    act(() => result.current.handleCloseAccounts());

    expect(replace).toHaveBeenLastCalledWith("/calendar?mode=list");

    params = new URLSearchParams("mode=list");
    rerender();
    expect(result.current.accountsOpen).toBe(false);
  });

  it("handleCloseAccounts without ?accounts=1 does not navigate", () => {
    params = new URLSearchParams("mode=list");
    const { result } = renderHook(() => useCalendarViewState());
    expect(result.current.accountsOpen).toBe(false);

    act(() => result.current.handleCloseAccounts());

    expect(replace).not.toHaveBeenCalled();
  });
});
