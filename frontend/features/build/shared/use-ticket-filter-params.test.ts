import { act, renderHook } from "@testing-library/react";
import { useTicketFilterParams } from "./use-ticket-filter-params";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/build/tickets",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

/**
 * Pins the behaviour the list-view seam has to preserve when this hook is
 * generalised off ticket vocabulary. Every assertion is about what reaches the
 * URL, never about which internal callback produced it.
 */

function lastParams(): URLSearchParams {
  const call = mockReplace.mock.calls.at(-1);
  const url = String(call?.[0] ?? "");
  const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  return new URLSearchParams(query);
}

function renderWith(query: string) {
  mockSearchParams = new URLSearchParams(query);
  window.history.replaceState(null, "", query ? `/build/tickets?${query}` : "/build/tickets");
  return renderHook(() => useTicketFilterParams());
}

describe("ticket filter URL state", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("hydrates every selection from the URL", () => {
    const { result } = renderWith(
      "status=OPEN,DONE&priority=HIGH&type=BUG&assigneeId=u1,u2&labels=3&cycle=9&projectIds=4&sprintId=7&dueDateFrom=2026-01-01&dueDateTo=2026-02-01&q=login",
    );

    expect(result.current.selectedStatuses).toEqual(["OPEN", "DONE"]);
    expect(result.current.selectedPriorities).toEqual(["HIGH"]);
    expect(result.current.selectedTypes).toEqual(["BUG"]);
    expect(result.current.selectedAssignees).toEqual(["u1", "u2"]);
    expect(result.current.selectedLabels).toEqual(["3"]);
    expect(result.current.selectedCycles).toEqual(["9"]);
    expect(result.current.selectedProjectIds).toEqual(["4"]);
    expect(result.current.sprintParam).toBe("7");
    expect(result.current.dueDateFrom).toBe("2026-01-01");
    expect(result.current.dueDateTo).toBe("2026-02-01");
    expect(result.current.q).toBe("login");
  });

  it("accumulates a multi-valued filter as a comma list", () => {
    const { result } = renderWith("status=OPEN");

    act(() => result.current.handleToggleStatus("DONE"));

    expect(lastParams().get("status")).toBe("OPEN,DONE");
  });

  it("removes a value when the same one is toggled again", () => {
    const { result } = renderWith("status=OPEN,DONE");

    act(() => result.current.handleToggleStatus("OPEN"));

    expect(lastParams().get("status")).toBe("DONE");
  });

  it("deletes the parameter rather than writing an empty one when the last value goes", () => {
    const { result } = renderWith("status=OPEN");

    act(() => result.current.handleToggleStatus("OPEN"));

    expect(lastParams().has("status")).toBe(false);
  });

  it("replaces rather than accumulates for a single-valued filter", () => {
    const { result } = renderWith("sprintId=7");

    act(() => result.current.handleToggleSprint("9"));

    expect(lastParams().get("sprintId")).toBe("9");
  });

  it("clears a single-valued filter when its current value is toggled", () => {
    const { result } = renderWith("sprintId=7");

    act(() => result.current.handleToggleSprint("7"));

    expect(lastParams().has("sprintId")).toBe(false);
  });

  it("returns to the first page whenever a filter changes", () => {
    const { result } = renderWith("status=OPEN&page=4");

    act(() => result.current.handleTogglePriority("HIGH"));

    expect(lastParams().has("page")).toBe(false);
  });

  it("removes one value from a group and leaves the rest", () => {
    const { result } = renderWith("assigneeId=u1,u2,u3");

    act(() => result.current.makeRemoveAssignee("u2")());

    expect(lastParams().get("assigneeId")).toBe("u1,u3");
  });

  it("clears both ends of the due-date range together", () => {
    const { result } = renderWith("dueDateFrom=2026-01-01&dueDateTo=2026-02-01");

    act(() => result.current.handleRemoveDueDate());

    expect(lastParams().has("dueDateFrom")).toBe(false);
    expect(lastParams().has("dueDateTo")).toBe(false);
  });

  it("clears every filter but keeps unrelated URL state", () => {
    const { result } = renderWith(
      "status=OPEN&priority=HIGH&sprintId=7&dueDateFrom=2026-01-01&page=3&q=login&tab=board",
    );

    act(() => result.current.clearAll());

    const params = lastParams();
    for (const key of [
      "status",
      "priority",
      "type",
      "sprintId",
      "assigneeId",
      "labels",
      "cycle",
      "projectIds",
      "dueDateFrom",
      "dueDateTo",
      "page",
    ]) {
      expect(params.has(key)).toBe(false);
    }
    expect(params.get("q")).toBe("login");
    expect(params.get("tab")).toBe("board");
  });

  it("counts active filter groups rather than selected values", () => {
    const { result } = renderWith("status=OPEN,DONE,BLOCKED&priority=HIGH");

    expect(result.current.activeFilterCount).toBe(2);
  });

  it("counts a due-date range as one active filter", () => {
    const { result } = renderWith("dueDateFrom=2026-01-01&dueDateTo=2026-02-01");

    expect(result.current.activeFilterCount).toBe(1);
  });

  it("counts nothing when no filter is applied", () => {
    const { result } = renderWith("q=login&page=2");

    expect(result.current.activeFilterCount).toBe(0);
  });

  it("settles rapid search input into one navigation", () => {
    jest.useFakeTimers();
    const { result } = renderWith("");

    act(() => result.current.handleSearchChange("l"));
    act(() => result.current.handleSearchChange("lo"));
    act(() => result.current.handleSearchChange("log"));
    act(() => result.current.handleSearchChange("login"));
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(lastParams().get("q")).toBe("login");
  });

  it("shows typed input immediately even before it reaches the URL", () => {
    jest.useFakeTimers();
    const { result } = renderWith("");

    act(() => result.current.handleSearchChange("log"));

    expect(result.current.localSearch).toBe("log");
    expect(result.current.q).toBe("");
  });
});
