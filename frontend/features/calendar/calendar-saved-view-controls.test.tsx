import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CalendarSavedViewControls } from "./calendar-saved-view-controls";

const mockFetchNextPage = jest.fn();
const mockUseCalendarSavedViews = jest.fn();
let reportVisible: (() => void) | undefined;
const originalIntersectionObserver = globalThis.IntersectionObserver;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => false }));
jest.mock("@/hooks/api/calendar-saved-views", () => ({
  useCalendarSavedViews: () => mockUseCalendarSavedViews(),
  useCreateCalendarSavedView: () => ({ isPending: false }),
  useUpdateCalendarSavedView: () => ({ isPending: false }),
  useDeleteCalendarSavedView: () => ({ isPending: false }),
}));
jest.mock("./calendar-saved-view-dialog", () => ({ CalendarSavedViewDialog: () => null }));
jest.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onOpenChange }: { children: ReactNode; onOpenChange?: (open: boolean) => void }) => (
    <div><button type="button" onClick={() => onOpenChange?.(true)}>Open saved views</button>{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  reportVisible = undefined;
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: class {
      constructor(callback: IntersectionObserverCallback) {
        reportVisible = () => Reflect.apply(callback, null, [[{ isIntersecting: true }], this]);
      }
      observe() {}
      disconnect() {}
    },
  });
  mockUseCalendarSavedViews.mockReturnValue({
    data: { pages: [{ actorMembershipId: 1, items: [] }] },
    dataUpdatedAt: 1,
    hasNextPage: true,
    isFetchingNextPage: false,
    isError: false,
    fetchNextPage: mockFetchNextPage,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: originalIntersectionObserver,
  });
});

it("continues saved-view pages when the picker footer becomes visible without duplicate requests", () => {
  const props: { selectedId: string | null; currentDate: Date; mode: "calendar" } = {
    selectedId: null,
    currentDate: new Date("2026-10-16T00:00:00.000Z"),
    mode: "calendar",
  };
  const view = render(<CalendarSavedViewControls {...props} />);
  expect(screen.queryByRole("button", { name: "More views" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Open saved views" }));
  expect(reportVisible).toBeDefined();
  act(() => { reportVisible?.(); reportVisible?.(); });
  expect(mockFetchNextPage).toHaveBeenCalledTimes(1);

  mockUseCalendarSavedViews.mockReturnValue({
    data: { pages: [{ actorMembershipId: 1, items: [] }, { actorMembershipId: 1, items: [] }] },
    dataUpdatedAt: 2,
    hasNextPage: true,
    isFetchingNextPage: false,
    isError: false,
    fetchNextPage: mockFetchNextPage,
  });
  view.rerender(<CalendarSavedViewControls {...props} />);
  act(() => { reportVisible?.(); });
  expect(mockFetchNextPage).toHaveBeenCalledTimes(2);
});
