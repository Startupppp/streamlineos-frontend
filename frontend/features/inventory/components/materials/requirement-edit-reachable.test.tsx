import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequirementRow } from "./requirement-row";
import type { ProjectRequirement } from "@/hooks/api/inventory/projects";

/**
 * `PATCH /inventory/projects/:projectId/requirements/:requirementId` had no
 * caller. A material line raised for the wrong quantity, the wrong date or the
 * wrong store could be reserved against and released, but never corrected — and
 * a line raised in error could not be cancelled, so it stayed on the site's
 * shortfall and in the at-risk count for good.
 *
 * The control is asserted from the requirement row the project screen renders,
 * which is the mount point a test of the sheet alone would have skipped.
 */

const mockCan = jest.fn((_key: string): boolean => true);
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) as boolean }));

const idle = { mutate: jest.fn(), isPending: false };
const update = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/api/inventory/projects", () => ({
  ...jest.requireActual("@/hooks/api/inventory/projects"),
  useReserveRequirement: () => idle,
  useReleaseRequirement: () => idle,
  useUpdateRequirement: () => update,
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: [{ id: 3, name: "North DC" }] }),
}));

const requirement: ProjectRequirement = {
  id: 21,
  projectId: 4,
  productVariantId: 7,
  warehouseId: 3,
  requiredQty: 120,
  fulfilledQty: 0,
  requiredBy: "2026-10-15",
  status: "REQUESTED",
  notes: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  variantSku: "TMT-12",
  variantName: null,
  productId: 2,
  productName: "TMT bar 12mm",
  productSku: "TMT",
  brand: null,
  materialGrade: "Fe500D",
  dimensionLabel: null,
  imageUrl: null,
  leadTimeDays: null,
  warehouseName: "North DC",
  warehouseCode: "GCH",
  warehouseZone: "NORTH",
  coverage: {
    requirementId: 21,
    requiredQty: 120,
    reservedQty: 40,
    fulfilledQty: 0,
    shortfallQty: 80,
    availableQty: 200,
    atRisk: false,
    riskReason: null,
  },
};

/** jsdom implements no pointer capture, which Radix's Select trigger calls. */
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
});

beforeEach(() => {
  mockCan.mockImplementation(() => true);
  update.mutate.mockClear();
});

function renderRow(): void {
  renderWithProviders(
    <TooltipProvider>
      <RequirementRow requirement={requirement} projectId={4} />
    </TooltipProvider>,
  );
}

it("puts an edit control on the requirement row the project screen renders", () => {
  renderRow();

  expect(screen.getByRole("button", { name: /edit line/i })).toBeInTheDocument();
});

it("opens on the line's own values", async () => {
  renderRow();
  await userEvent.click(screen.getByRole("button", { name: /edit line/i }));

  expect(await screen.findByRole("dialog")).toHaveTextContent("Edit requirement");
  expect(screen.getByLabelText(/quantity needed/i)).toHaveValue("120");
  expect(screen.getByLabelText(/needed by/i)).toHaveValue("2026-10-15");
});

it("sends the line the endpoint's own fields, quantity as a string", async () => {
  renderRow();
  await userEvent.click(screen.getByRole("button", { name: /edit line/i }));
  await userEvent.click(await screen.findByRole("button", { name: /save line/i }));

  await waitFor(() => expect(update.mutate).toHaveBeenCalledTimes(1));
  expect(update.mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      projectId: 4,
      requirementId: 21,
      requiredQty: "120",
      requiredBy: "2026-10-15",
      warehouseId: 3,
      status: "REQUESTED",
    }),
    expect.anything(),
  );
});

/**
 * `RESERVED`, `PARTIALLY_FULFILLED` and `FULFILLED` are what reserving and
 * dispatching make true. The endpoint refuses them and so does the form, rather
 * than offering a status that would claim stock is held that nothing is holding.
 */
it("offers only the three statuses a planner may set", async () => {
  renderRow();
  await userEvent.click(screen.getByRole("button", { name: /edit line/i }));
  await userEvent.click(await screen.findByRole("combobox", { name: /status/i }));

  expect(screen.getByRole("option", { name: "Cancelled" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /reserved/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /fulfilled/i })).not.toBeInTheDocument();
});

it("hides the edit control from somebody who may reserve but not plan", () => {
  mockCan.mockImplementation((key: string) => key !== "inventory:projects:manage");
  renderRow();

  expect(screen.queryByRole("button", { name: /edit line/i })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /reserve stock/i })).toBeInTheDocument();
});
