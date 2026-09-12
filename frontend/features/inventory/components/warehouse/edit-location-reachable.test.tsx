import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocationRow } from "./location-row";
import type { WarehouseLocation } from "@/hooks/api/inventory/warehouses";

/**
 * `PATCH /inventory/warehouses/:warehouseId/locations/:locationId` had no
 * caller. A bin created with the wrong code, the wrong flags or in the wrong
 * aisle stayed that way, and a location taken out of use could not be closed —
 * it kept being offered as a putaway destination for the life of the warehouse.
 *
 * The control is asserted from the row the warehouse screen renders, which is
 * the mount point a component test of the sheet would have skipped.
 *
 * Two contract details are pinned here because both were wrong on the create
 * path they are shared with: `capacity` is a decimal STRING (the column is
 * `numeric(18,4)` and the `.strict()` schema rejects a number), and
 * `parentLocationId` has no null, so a location that has a parent is never
 * offered None.
 */

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

/**
 * jsdom implements no pointer capture, and Radix's Select trigger calls it on
 * pointer-down — so opening one throws rather than opening. Stubbed here rather
 * than in the shared setup so this test owns its own gap.
 */
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

/**
 * `updateLocationSchema` takes `parentLocationId` as a positive integer with no
 * null, so detaching is not expressible. Offering None to a location that has a
 * parent would be a control that silently does nothing.
 */
it("does not offer None to a location that already has a parent", async () => {
  renderRow(bin);
  await userEvent.click(screen.getByRole("button", { name: /^edit$/i }));
  await userEvent.click(await screen.findByRole("combobox", { name: /parent location/i }));

  expect(screen.queryByRole("option", { name: "None" })).not.toBeInTheDocument();
  expect(
    screen.getByText(/can be moved to another zone, aisle or rack, but not removed/i),
  ).toBeInTheDocument();
});
