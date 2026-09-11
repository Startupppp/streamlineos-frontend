import { act, renderHook } from "@testing-library/react";
import { useExceptionFilters } from "./use-exception-filters";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/timesheets/exceptions",
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

describe("exceptions queue URL state", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  it("opens on the open queue with no params in the URL", () => {
    const { result } = renderHook(() => useExceptionFilters());

    expect(result.current.statusParam).toBe("OPEN");
    expect(result.current.severityParam).toBeUndefined();
    expect(result.current.ruleParam).toBeUndefined();
    expect(result.current.userIdParam).toBeUndefined();
    expect(result.current.isDefault).toBe(true);
    expect(result.current.activeCount).toBe(0);
  });

  it("treats status=all as a request for every status, not as a status", () => {
    mockSearchParams = new URLSearchParams("status=all");
    const { result } = renderHook(() => useExceptionFilters());

    expect(result.current.statusParam).toBeUndefined();
    expect(result.current.isDefault).toBe(false);
    expect(result.current.activeCount).toBe(1);
  });

  it("restores a shared queue from the URL", () => {
    mockSearchParams = new URLSearchParams(
      "status=RESOLVED&severity=ERROR&rule=UNDER_HOURS&userId=usr_7",
    );
    const { result } = renderHook(() => useExceptionFilters());

    expect(result.current.statusParam).toBe("RESOLVED");
    expect(result.current.severityParam).toBe("ERROR");
    expect(result.current.ruleParam).toBe("UNDER_HOURS");
    expect(result.current.userIdParam).toBe("usr_7");
    expect(result.current.activeCount).toBe(4);
  });

  it("drops a filter from the URL when it returns to its default", () => {
    mockSearchParams = new URLSearchParams("severity=ERROR&rule=UNDER_HOURS");
    const { result } = renderHook(() => useExceptionFilters());

    act(() => result.current.setSeverity("all"));

    expect(mockReplace).toHaveBeenCalledWith("/timesheets/exceptions?rule=UNDER_HOURS", {
      scroll: false,
    });
  });

  it("drops status from the URL when it returns to OPEN", () => {
    mockSearchParams = new URLSearchParams("status=DISMISSED");
    const { result } = renderHook(() => useExceptionFilters());

    act(() => result.current.setStatus("OPEN"));

    expect(mockReplace).toHaveBeenCalledWith("/timesheets/exceptions", {
      scroll: false,
    });
  });

  it("writes a chosen filter into the URL so the queue can be handed over", () => {
    const { result } = renderHook(() => useExceptionFilters());

    act(() => result.current.setUserId("usr_42"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/timesheets/exceptions?userId=usr_42",
      { scroll: false },
    );
  });

  it("clears only its own params, leaving unrelated URL state alone", () => {
    mockSearchParams = new URLSearchParams(
      "status=all&severity=ERROR&rule=MISSING_RATE&userId=usr_1&tab=audit",
    );
    const { result } = renderHook(() => useExceptionFilters());

    act(() => result.current.clear());

    expect(mockReplace).toHaveBeenCalledWith("/timesheets/exceptions?tab=audit", {
      scroll: false,
    });
  });

  it("ignores a garbage param rather than sending it to the API", () => {
    mockSearchParams = new URLSearchParams("status=NOPE&severity=LOUD&rule=nonsense");
    const { result } = renderHook(() => useExceptionFilters());

    expect(result.current.statusParam).toBeUndefined();
    expect(result.current.severityParam).toBeUndefined();
    expect(result.current.ruleParam).toBeUndefined();
  });
});
