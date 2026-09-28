import { renderHook, act } from "@testing-library/react";
import {
  boardState,
  installBoardUrlStateMocks,
  mockCreateViewMutate,
  mockPush,
  mockReplace,
  mockUpdateViewMutate,
  mockUseBugs,
  nameEvent,
  setParams,
} from "./use-board-url-state-test-harness";
import { useBoardUrlState } from "./use-board-url-state";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-panel";

beforeEach(installBoardUrlStateMocks);

describe("useBoardUrlState — QA filters replace the standalone Bugs page", () => {
  it("does not query the bugs endpoint when no QA filter is set", () => {
    setParams({ type: "BUG" });

    renderHook(() => useBoardUrlState(1));

    expect(mockUseBugs).toHaveBeenCalledWith(undefined, {
      severity: undefined,
      status: undefined,
    });
  });

  it("does not query the bugs endpoint when a severity is set but the list is not scoped to bugs", () => {
    setParams({ severity: "blocker" });

    renderHook(() => useBoardUrlState(1));

    expect(mockUseBugs).toHaveBeenCalledWith(undefined, {
      severity: "blocker",
      status: undefined,
    });
  });

  it("queries the bugs endpoint with severity and QA state once the list is scoped to bugs", () => {
    setParams({ type: "BUG", severity: "blocker", qaState: "ready_for_qa" });

    renderHook(() => useBoardUrlState(1));

    expect(mockUseBugs).toHaveBeenCalledWith(1, {
      severity: "blocker",
      status: "ready_for_qa",
    });
  });

  it("counts a severity filter as an active filter so the empty state explains itself", () => {
    setParams({ type: "BUG", severity: "blocker" });

    const { result } = renderHook(() => useBoardUrlState(1));

    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("clears severity and QA state alongside the other filters", () => {
    setParams({
      type: "BUG",
      severity: "blocker",
      qaState: "verified",
      dueDateFrom: "2026-01-01",
      dueDateTo: "2026-01-31",
    });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleClearSearch();
    });

    const written = new URLSearchParams(mockReplace.mock.calls[0][0].slice(1));
    expect(written.get("severity")).toBeNull();
    expect(written.get("qaState")).toBeNull();
    expect(written.get("dueDateFrom")).toBeNull();
    expect(written.get("dueDateTo")).toBeNull();
  });

  it("writes a QA filter to the URL so a filtered defect list is shareable", () => {
    setParams({ type: "BUG" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleQaFilterChange("severity", "critical");
    });

    const written = new URLSearchParams(mockReplace.mock.calls[0][0].slice(1));
    expect(written.get("severity")).toBe("critical");
  });

  it("removes a QA filter from the URL when it is set back to any", () => {
    setParams({ type: "BUG", severity: "critical" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleQaFilterChange("severity", "");
    });

    const written = new URLSearchParams(mockReplace.mock.calls[0][0].slice(1));
    expect(written.get("severity")).toBeNull();
  });

  it("carries severity and QA state into a saved view so a defect view reopens filtered", () => {
    setParams({ type: "BUG", severity: "major", qaState: "reopened" });

    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleSaveViewNameChange(nameEvent("Open majors"));
    });
    act(() => {
      result.current.handleSaveView();
    });

    const payload = mockCreateViewMutate.mock.calls[0][0] as {
      filters: Record<string, string>;
    };
    expect(payload.filters.severity).toBe("major");
    expect(payload.filters.qaState).toBe("reopened");
  });
});
