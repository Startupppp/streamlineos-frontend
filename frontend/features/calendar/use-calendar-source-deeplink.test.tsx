import { renderHook } from "@testing-library/react";

/**
 * `/calendar?source=<key>` is the other half of removing the HR interviews
 * calendar: the module page hands its events to the unified calendar, and the
 * link has to survive a viewer who has that source switched off — otherwise
 * "View in calendar" lands on a calendar with none of the events on it.
 */

const replace = jest.fn();
let currentParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => currentParams,
}));

const useCalendarSources = jest.fn();
const setPreference = jest.fn();

jest.mock("@/hooks/api/calendar", () => ({
  useCalendarSources: () => useCalendarSources(),
  useSetCalendarSourcePreference: () => ({ mutate: setPreference }),
}));

import { useCalendarSourceDeepLink } from "./use-calendar-source-deeplink";

const SOURCES = [
  { key: "hr-interviews", label: "Interviews", module: "hr", enabled: false },
  { key: "hr-leaves", label: "Leaves", module: "hr", enabled: true },
];

beforeEach(() => {
  jest.clearAllMocks();
  currentParams = new URLSearchParams();
  useCalendarSources.mockReturnValue({ data: SOURCES });
});

describe("useCalendarSourceDeepLink", () => {
  it("enables a source the viewer had switched off", () => {
    currentParams = new URLSearchParams("source=hr-interviews");

    renderHook(() => useCalendarSourceDeepLink());

    expect(setPreference).toHaveBeenCalledTimes(1);
    expect(setPreference).toHaveBeenCalledWith({
      sourceKey: "hr-interviews",
      enabled: true,
    });
    expect(replace).toHaveBeenCalledWith("/calendar");
  });

  it("does not re-write a preference that is already on", () => {
    currentParams = new URLSearchParams("source=hr-leaves");

    renderHook(() => useCalendarSourceDeepLink());

    expect(setPreference).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/calendar");
  });

  it("ignores a key that is not a registered source but still strips the param", () => {
    currentParams = new URLSearchParams("source=not-a-source");

    renderHook(() => useCalendarSourceDeepLink());

    expect(setPreference).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/calendar");
  });

  it("preserves every other query param when it strips its own", () => {
    currentParams = new URLSearchParams("source=hr-interviews&create=1");

    renderHook(() => useCalendarSourceDeepLink());

    expect(replace).toHaveBeenCalledWith("/calendar?create=1");
  });

  it("does nothing at all without the param", () => {
    renderHook(() => useCalendarSourceDeepLink());

    expect(setPreference).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("waits for the source list rather than deciding against an undefined one", () => {
    currentParams = new URLSearchParams("source=hr-interviews");
    useCalendarSources.mockReturnValue({ data: undefined });

    const { rerender } = renderHook(() => useCalendarSourceDeepLink());

    expect(setPreference).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    useCalendarSources.mockReturnValue({ data: SOURCES });
    rerender();

    expect(setPreference).toHaveBeenCalledWith({
      sourceKey: "hr-interviews",
      enabled: true,
    });
  });

  it("BITE: consumes the param exactly once, so a re-render cannot re-enable a source the user just turned off", () => {
    currentParams = new URLSearchParams("source=hr-interviews");

    const { rerender } = renderHook(() => useCalendarSourceDeepLink());
    rerender();
    rerender();

    expect(setPreference).toHaveBeenCalledTimes(1);
  });
});
