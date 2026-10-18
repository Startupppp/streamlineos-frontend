import { act, renderHook } from "@testing-library/react";
import { useCalendarViewState } from "./use-calendar-view-state";

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearch = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("./use-calendar-slot-selection-guard", () => ({
  useCalendarSlotSelectionGuard: (_fn: unknown) => _fn,
}));

beforeEach(() => {
  mockReplace.mockReset();
  mockPush.mockReset();
  mockSearch = "";
});

describe("useCalendarViewState — shouldMountCreate latch (#187)", () => {
  it("shouldMountCreate is false before the dialog has ever been opened", () => {
    const { result } = renderHook(() => useCalendarViewState());
    expect(result.current.shouldMountCreate).toBe(false);
  });

  it("shouldMountCreate becomes true after handleOpenCreate is called the first time", () => {
    const { result } = renderHook(() => useCalendarViewState());
    act(() => {
      result.current.handleOpenCreate();
    });
    expect(result.current.shouldMountCreate).toBe(true);
    expect(result.current.isCreateOpen).toBe(true);
  });

  it("shouldMountCreate stays true after the dialog is closed so a re-open is not a fresh mount", () => {
    const { result } = renderHook(() => useCalendarViewState());
    act(() => {
      result.current.handleOpenCreate();
    });
    act(() => {
      result.current.setIsCreateOpen(false);
    });
    expect(result.current.shouldMountCreate).toBe(true);
    expect(result.current.isCreateOpen).toBe(false);
  });

  it("isCreateOpen becomes true again on a second handleOpenCreate without remounting", () => {
    const { result } = renderHook(() => useCalendarViewState());
    act(() => {
      result.current.handleOpenCreate();
    });
    act(() => {
      result.current.setIsCreateOpen(false);
    });
    act(() => {
      result.current.handleOpenCreate();
    });
    expect(result.current.shouldMountCreate).toBe(true);
    expect(result.current.isCreateOpen).toBe(true);
  });
});

describe("useCalendarViewState — UX notes", () => {
  it("defaults a new event to the day being viewed, not today", () => {
    mockSearch = "date=2027-03-10";
    const { result } = renderHook(() => useCalendarViewState());
    act(() => {
      result.current.handleOpenCreate();
    });
    expect(result.current.createSlot?.start.getFullYear()).toBe(2027);
    expect(result.current.createSlot?.start.getMonth()).toBe(2);
    expect(result.current.createSlot?.start.getDate()).toBe(10);
    expect(result.current.createSlot?.start.getHours()).toBe(9);
  });

  it("moves by one period with the arrow keys and returns to today with t", () => {
    mockSearch = "date=2027-03-10&view=week";
    renderHook(() => useCalendarViewState());

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    });
    expect(mockPush).toHaveBeenLastCalledWith(expect.stringContaining("date=2027-03-17"));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    });
    expect(mockPush).toHaveBeenLastCalledWith(expect.stringContaining("date=2027-03-03"));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "t" }));
    });
    expect(mockPush).toHaveBeenCalledTimes(3);
  });

  it("ignores the shortcuts while the user types in a field", () => {
    mockSearch = "date=2027-03-10&view=week";
    renderHook(() => useCalendarViewState());
    const input = document.createElement("input");
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    });
    expect(mockPush).not.toHaveBeenCalled();
    input.remove();
  });
});
