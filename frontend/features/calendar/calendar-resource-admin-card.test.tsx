import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarResourceAdminCard } from "./calendar-resource-admin-card";

const createResource = jest.fn();
const createEquipment = jest.fn();
let inventoryDenied = false;
let inventoryModuleEnabled = true;

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "user-1" } } }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useModuleEnabled: () => inventoryModuleEnabled,
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: { items: [{ id: 4, name: "Main warehouse", code: "MAIN", isActive: true }], totalPages: 1 }, isPending: false, isError: false, isFetching: false }),
}));

jest.mock("@/hooks/api/inventory/products", () => ({
  useProductVariants: () => ({ data: [{ id: 7, productName: "Camera", name: "Standard", sku: "CAM-STD" }], isLoading: false }),
}));

jest.mock("@/hooks/api/calendar/booking-resources", () => ({
  useCalendarBookingResources: (cursor: string | undefined) => ({
    data: cursor === "1"
      ? { items: [{ id: 2, name: "Annex room", kind: "room", ownership: "calendar", sourceKey: null, sourceRecordId: null, location: "Annex", capacity: 4, divisible: false, accessibility: [], requiresApproval: false, status: "active", version: 1, createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" }], nextCursor: null }
      : { items: [], nextCursor: "1" },
    access: { allowed: true, denied: false, pending: false, unavailable: false },
  }),
  useInventoryCalendarEquipment: (cursor: number | null) => ({
    data: cursor === 12
      ? { items: [{ id: 13, name: "Mobile camera", location: "Annex", capacity: 1, warehouseId: 4, status: "available" }], nextCursor: null }
      : { items: [{ id: 12, name: "Portable camera", location: "Studio", capacity: 2, warehouseId: 4, status: "available" }], nextCursor: 12 },
    access: { allowed: !inventoryDenied, denied: inventoryDenied, pending: false, unavailable: false },
  }),
  useCreateInventoryCalendarEquipment: () => ({ mutateAsync: createEquipment, isPending: false }),
  useCreateCalendarResource: () => ({ mutateAsync: createResource, isPending: false }),
  useUpdateCalendarResource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useAddCalendarResourceMaintenance: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

it("shows Calendar resources from a later catalog page", async () => {
  const user = userEvent.setup();
  render(<CalendarResourceAdminCard />);

  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Annex room")).toBeInTheDocument();
});

it("does not offer Inventory equipment setup when Inventory access is denied", async () => {
  inventoryDenied = true;
  try {
    const user = userEvent.setup();
    render(<CalendarResourceAdminCard />);
    await user.click(screen.getByRole("button", { name: "Add resource" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Owner" }), { key: "ArrowDown" });
    await user.click(screen.getByRole("option", { name: "Inventory equipment" }));
    expect(screen.getByText("Inventory is unavailable to this account or organization.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Inventory equipment" })).not.toBeInTheDocument();
  } finally {
    inventoryDenied = false;
  }
});

it("does not offer Inventory equipment ownership when the organization has Inventory disabled", async () => {
  inventoryModuleEnabled = false;
  try {
    const user = userEvent.setup();
    render(<CalendarResourceAdminCard />);
    await user.click(screen.getByRole("button", { name: "Add resource" }));
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Owner" }), { key: "ArrowDown" });
    expect(screen.queryByRole("option", { name: "Inventory equipment" })).not.toBeInTheDocument();
  } finally {
    inventoryModuleEnabled = true;
  }
});

it("creates source-owned equipment from Calendar and links the returned record", async () => {
  createResource.mockReset().mockResolvedValue({});
  createEquipment.mockReset().mockResolvedValue({ id: 27, orgId: "org-1", warehouseId: 4, productVariantId: 7, name: "QA camera", location: "Studio", capacity: 1, status: "available", version: 1, createdAt: "2026-10-16T00:00:00.000Z", updatedAt: "2026-10-16T00:00:00.000Z" });
  const user = userEvent.setup();
  render(<CalendarResourceAdminCard />);

  await user.click(screen.getByRole("button", { name: "Add resource" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Owner" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Inventory equipment" }));
  await user.click(screen.getByRole("button", { name: "Create Inventory equipment" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Warehouse" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Main warehouse · MAIN" }));
  await user.click(screen.getByRole("combobox", { name: "Inventory product variant" }));
  await user.click(screen.getByRole("option", { name: /Camera — Standard/ }));
  await user.type(screen.getByRole("textbox", { name: "Equipment name" }), "QA camera");
  await user.type(screen.getByRole("textbox", { name: "Equipment location" }), "Studio");
  await user.click(screen.getByRole("button", { name: "Create and select equipment" }));

  await waitFor(() => expect(createEquipment).toHaveBeenCalledWith({ warehouseId: 4, productVariantId: 7, name: "QA camera", location: "Studio", capacity: 1 }));
  await user.click(screen.getByRole("button", { name: "Save resource" }));
  await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({ sourceKey: "inventory.equipment", sourceRecordId: "27", ownership: "source", requiresApproval: true })));
});

it("links selected Inventory equipment with source ownership and owner approval", async () => {
  createResource.mockReset().mockResolvedValue({});
  const user = userEvent.setup();
  render(<CalendarResourceAdminCard />);

  await user.click(screen.getByRole("button", { name: "Add resource" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Owner" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Inventory equipment" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Inventory equipment" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Portable camera · warehouse 4 · capacity 2" }));
  await user.click(screen.getByRole("button", { name: "Save resource" }));

  await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
    kind: "equipment",
    ownership: "source",
    sourceKey: "inventory.equipment",
    sourceRecordId: "12",
    name: "Portable camera",
    location: "Studio",
    capacity: 2,
    requiresApproval: true,
  })));
});

it("can select Inventory equipment from a later catalog page", async () => {
  createResource.mockReset().mockResolvedValue({});
  const user = userEvent.setup();
  render(<CalendarResourceAdminCard />);

  await user.click(screen.getByRole("button", { name: "Add resource" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Owner" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Inventory equipment" }));
  await user.click(screen.getByRole("button", { name: "Next equipment" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Inventory equipment" }), { key: "ArrowDown" });
  await user.click(screen.getByRole("option", { name: "Mobile camera · warehouse 4 · capacity 1" }));
  await user.click(screen.getByRole("button", { name: "Save resource" }));

  await waitFor(() => expect(createResource).toHaveBeenCalledWith(expect.objectContaining({
    sourceRecordId: "13",
    name: "Mobile camera",
    capacity: 1,
  })));
});
