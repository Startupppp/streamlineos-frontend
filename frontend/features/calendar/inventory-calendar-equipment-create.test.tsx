import { Component, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { readErrorReachesBoundary } from "@/lib/query-error-policy";
import { InventoryCalendarEquipmentCreate } from "./inventory-calendar-equipment-create";

const get = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: (...args: unknown[]) => get(...args) } }));
jest.mock("@/hooks/api/calendar/booking-resources", () => ({
  useCreateInventoryCalendarEquipment: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));
jest.mock("@/components/inventory/product-variant-combobox", () => ({
  ProductVariantCombobox: () => null,
}));

class CalendarErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p>Calendar error boundary</p> : this.props.children;
  }
}

it("keeps a failed warehouse read inside the open Calendar equipment form", async () => {
  get.mockReset()
    .mockRejectedValueOnce(new Error("Warehouse read unavailable"))
    .mockResolvedValue({ items: [{ id: 4, name: "Main warehouse", code: "MAIN", isActive: true }], totalPages: 1 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, throwOnError: readErrorReachesBoundary } } });

  render(
    <QueryClientProvider client={client}>
      <CalendarErrorBoundary><InventoryCalendarEquipmentCreate onCreated={jest.fn()} /></CalendarErrorBoundary>
    </QueryClientProvider>,
  );

  expect(await screen.findByText("Warehouses unavailable")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("combobox", { name: "Warehouse" })).toBeInTheDocument();
  expect(screen.getByText("Create Inventory equipment")).toBeInTheDocument();
  expect(screen.queryByText("Calendar error boundary")).not.toBeInTheDocument();
});
