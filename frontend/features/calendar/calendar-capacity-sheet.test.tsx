import type { ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { CalendarCapacitySheet } from "./calendar-capacity-sheet";

jest.mock("./calendar-capacity-allocation-proposal", () => ({
  CalendarCapacityAllocationProposal: ({ allocation, onDone }: { allocation: { id: string }; onDone: () => void }) => (
    <div data-testid="allocation-proposal">
      allocation-{allocation.id}
      <button onClick={onDone}>Done</button>
    </div>
  ),
}));

const fetchNextPage = jest.fn();

jest.mock("@/components/shared/app-sheet", () => ({
  AppSheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("./calendar-capacity-window", () => ({
  CapacityWindowFields: () => <div>Capacity window</div>,
}));

const mockAccess = { can: false, inventory: true };
const mockUseWarehouses = jest.fn((..._args: unknown[]) => ({ data: { items: [], total: 0 } }));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockAccess.can,
  useModuleEnabled: () => mockAccess.inventory,
  useScope: () => "none",
}));

jest.mock("@/hooks/api/directory/people", () => ({
  usePeople: () => ({ data: { data: [], pageInfo: { hasMore: false } } }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: (...args: unknown[]) => mockUseWarehouses(...args),
}));

jest.mock("@/hooks/api/calendar-capacity", () => ({
  useCalendarResources: () => ({
    data: { pages: [{ items: [
      { id: 1, name: "First room", kind: "room", ownership: "calendar", location: null },
      { id: 2, name: "QA equipment", kind: "equipment", ownership: "source", location: "Main" },
    ], nextCursor: "2" }] },
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage,
  }),
  useCalendarCapacity: () => ({
    isLoading: false,
    data: {
      coverage: "complete",
      evaluatedAt: "2026-10-16T12:00:00.000Z",
      slices: [],
      allocations: [
        {
          id: "alloc-1",
          bookingId: "booking-1",
          start: "2026-10-16T10:00:00.000Z",
          end: "2026-10-16T11:00:00.000Z",
          units: 1,
          state: "confirmed",
          version: "1",
          sourceKey: null,
          bookingLifecycleVersion: "2",
        },
      ],
    },
  }),
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

it("identifies source-owner coverage for source-owned equipment", async () => {
  renderWithProviders(<CalendarCapacitySheet onClose={jest.fn()} />);

  expect(screen.getByText(/Complete Calendar-owned resource coverage/)).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Resource" }), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: /QA equipment/ }));

  expect(screen.getByText(/Complete source-owner resource coverage/)).toBeInTheDocument();
});

describe("allocation reschedule proposal", () => {
  it("shows a Reschedule button for each allocation in a resources capacity view", () => {
    renderWithProviders(<CalendarCapacitySheet onClose={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument();
  });

  it("renders the proposal panel when Reschedule is clicked and closes it on Done", async () => {
    renderWithProviders(<CalendarCapacitySheet onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    const panel = await screen.findByTestId("allocation-proposal");
    expect(panel).toHaveTextContent("allocation-alloc-1");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByTestId("allocation-proposal")).toBeNull();
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument();
  });
});

describe("UX: inventory off the plan never reaches the warehouse read", () => {
  afterEach(() => {
    mockAccess.can = false;
    mockAccess.inventory = true;
    mockUseWarehouses.mockClear();
  });

  it("hides Warehouse work and keeps the read disabled when inventory is not enabled", () => {
    mockAccess.can = true;
    mockAccess.inventory = false;
    renderWithProviders(<CalendarCapacitySheet onClose={jest.fn()} />);

    expect(screen.queryByRole("button", { name: "Warehouse work" })).toBeNull();
    expect(mockUseWarehouses.mock.calls.every((call) => (call[1] as { enabled: boolean }).enabled === false)).toBe(true);
  });

  it("offers Warehouse work and loads warehouses only once it is chosen", () => {
    mockAccess.can = true;
    renderWithProviders(<CalendarCapacitySheet onClose={jest.fn()} />);

    expect((mockUseWarehouses.mock.calls.at(-1)?.[1] as { enabled: boolean }).enabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Warehouse work" }));
    expect((mockUseWarehouses.mock.calls.at(-1)?.[1] as { enabled: boolean }).enabled).toBe(true);
  });
});
