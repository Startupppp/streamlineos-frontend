import type { ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { CalendarCapacitySheet } from "./calendar-capacity-sheet";

const fetchNextPage = jest.fn();

jest.mock("@/components/shared/app-sheet", () => ({
  AppSheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("./calendar-capacity-window", () => ({
  CapacityWindowFields: () => <div>Capacity window</div>,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useScope: () => "none",
}));

jest.mock("@/hooks/api/directory/people", () => ({
  usePeople: () => ({ data: { data: [], pageInfo: { hasMore: false } } }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: { items: [], total: 0 } }),
}));

jest.mock("@/hooks/api/calendar-capacity", () => ({
  useCalendarResources: () => ({
    data: { pages: [{ items: [{ id: 1, name: "First room", kind: "room", location: null }], nextCursor: "1" }] },
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage,
  }),
  useCalendarCapacity: () => ({ isLoading: false }),
  useCalendarPersonalCapacity: () => ({ isLoading: false }),
  useCalendarTeamCapacity: () => ({ isLoading: false }),
  useCalendarWarehouseCapacity: () => ({ isLoading: false }),
}));

it("loads the next resource page from the keyboard while the selector is open", async () => {
  fetchNextPage.mockReset();
  renderWithProviders(<CalendarCapacitySheet onClose={jest.fn()} />);

  fireEvent.keyDown(screen.getByRole("combobox", { name: "Resource" }), { key: "ArrowDown" });
  const first = await screen.findByRole("option", { name: /First room/ });
  fireEvent.keyDown(first, { key: "End" });

  expect(fetchNextPage).toHaveBeenCalledTimes(1);
});
