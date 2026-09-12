import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { ChannelSheet } from "./channel-sheet";

/**
 * `POST /inventory/channels` and `PATCH /inventory/channels/:id` are both
 * `.strict()`, `safetyBuffer` and `publishThreshold` are `decimal(18,4)`
 * strings, and the create body has no `status` at all — a channel is raised
 * ACTIVE and paused by an update.
 *
 * The sheet sent `Number(...)` for both figures and a `status` on create, so
 * every New Channel submit was a 400 that read like a validation failure on the
 * name.
 */

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: { items: [], total: 0, page: 1, totalPages: 0 } }),
}));

const createMutateAsync = jest.fn(() => Promise.resolve());
const updateMutateAsync = jest.fn(() => Promise.resolve());

jest.mock("@/hooks/api/inventory/channels", () => ({
  useCreateChannel: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateChannel: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
}));

function submitSheet(): void {
  const form = document.getElementById("channel-form");
  if (!form) throw new Error("the channel form did not render");
  fireEvent.submit(form);
}

beforeEach(() => {
  createMutateAsync.mockClear();
  updateMutateAsync.mockClear();
});

it("creates a channel with decimal strings and without a status", async () => {
  renderWithProviders(<ChannelSheet open onOpenChange={jest.fn()} />);

  await userEvent.type(
    screen.getByPlaceholderText("e.g. Shopify Main Store"),
    "Shopify Main Store",
  );
  await userEvent.type(screen.getAllByPlaceholderText("0")[0], "2.5");
  submitSheet();

  await waitFor(() => {
    expect(createMutateAsync).toHaveBeenCalledTimes(1);
  });
  expect(createMutateAsync).toHaveBeenCalledWith({
    name: "Shopify Main Store",
    channelType: "INTERNAL",
    safetyBuffer: "2.5",
    publishThreshold: undefined,
    warehouseIds: [],
  });
});

it("keeps the status field for an update, which is the only body that takes one", async () => {
  renderWithProviders(
    <ChannelSheet
      open
      onOpenChange={jest.fn()}
      channel={{
        id: 4,
        orgId: "org_1",
        name: "Shopify Main Store",
        channelType: "SHOPIFY",
        status: "ACTIVE",
        safetyBuffer: "2.5000",
        publishThreshold: null,
        warehouseIds: [],
        lastSyncStatus: null,
        lastSyncAt: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      }}
    />,
  );

  expect(screen.getByText("Status")).toBeInTheDocument();
  submitSheet();

  await waitFor(() => {
    expect(updateMutateAsync).toHaveBeenCalledTimes(1);
  });
  expect(updateMutateAsync).toHaveBeenCalledWith({
    channelId: 4,
    name: "Shopify Main Store",
    status: "ACTIVE",
    safetyBuffer: "2.5000",
    publishThreshold: undefined,
    warehouseIds: [],
  });
});
