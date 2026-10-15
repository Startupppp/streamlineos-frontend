import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarResourceAdminCard } from "./calendar-resource-admin-card";

const createResource = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/calendar/booking-resources", () => ({
  useCalendarBookingResources: () => ({ data: [], access: { allowed: true, denied: false, pending: false, unavailable: false } }),
  useInventoryCalendarEquipment: () => ({ data: [{ id: 12, name: "Portable camera", location: "Studio", capacity: 2, warehouseId: 4, status: "available" }], access: { allowed: true, denied: false, pending: false, unavailable: false } }),
  useCreateCalendarResource: () => ({ mutateAsync: createResource, isPending: false }),
  useUpdateCalendarResource: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useAddCalendarResourceMaintenance: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

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
