import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocationRow } from "./location-row";
import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";


jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

const mutate = jest.fn();
jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useUpdateLocation: jest.fn(() => ({ mutate, isPending: false })),
}));

const zone: WarehouseLocation = {
  id: 1,
  orgId: "org",
  warehouseId: 5,
  parentLocationId: null,
  name: "Zone A",
  code: "ZA",
  locationType: "ZONE",
  isPickable: false,
  isReceivable: false,
  isSellable: false,
  capacity: null,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const bin: WarehouseLocation = {
  ...zone,
  id: 2,
  parentLocationId: 1,
  name: "Bin A-01",
  code: "A01",
  locationType: "BIN",
  isPickable: true,
  isReceivable: true,
  isSellable: true,
  capacity: "250.0000",
};

function renderRow(location: WarehouseLocation): void {
  renderWithProviders(
    <TooltipProvider>
      <LocationRow location={location} warehouseId={5} locations={[zone, bin]} />
    </TooltipProvider>,
  );
}

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
});

beforeEach(() => {
  mutate.mockClear();
});

it("puts an edit control on the location row the warehouse screen renders", () => {
  renderRow(bin);

  expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
});

it("opens on the location's own values, capacity included", async () => {
  renderRow(bin);
  await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));

  expect(await screen.findByRole("dialog")).toHaveTextContent("Edit Location");
  expect(screen.getByLabelText(/^name/i)).toHaveValue("Bin A-01");
  expect(screen.getByLabelText(/capacity/i)).toHaveValue("250.0000");
});

it("sends capacity as the decimal string the endpoint validates", async () => {
  renderRow(bin);
  await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
  await userEvent.click(await screen.findByRole("button", { name: /save changes/i }));

  await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      warehouseId: 5,
      locationId: 2,
      capacity: "250.0000",
      isActive: true,
    }),
    expect.anything(),
  );
});

it("does not offer None to a location that already has a parent", async () => {
  renderRow(bin);
  await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
  await userEvent.click(await screen.findByRole("combobox", { name: /parent location/i }));

  expect(screen.queryByRole("option", { name: "None" })).not.toBeInTheDocument();
  expect(
    screen.getByText(/can be moved to another zone, aisle or rack, but not removed/i),
  ).toBeInTheDocument();
});
