import { act, renderHook } from "@testing-library/react";
import { useCalendarViewState } from "./use-calendar-view-state";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("./use-calendar-slot-selection-guard", () => ({
  useCalendarSlotSelectionGuard: (_fn: unknown) => _fn,
}));

beforeEach(() => {
  mockReplace.mockReset();
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
