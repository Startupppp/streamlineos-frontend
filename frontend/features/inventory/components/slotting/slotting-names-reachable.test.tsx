import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import SlottingPage from "@/app/(authenticated)/inventory/slotting/page";
import type {
  SlottingRecommendation,
  SlottingRule,
} from "@/hooks/api/inventory/slotting-labor";

/**
 * Every identifying column on this page printed a primary key — `Category #12`,
 * `Variant #40`, `Zone #7`, `#8` — and the Approve control asked a supervisor to
 * type one into a text box. §5 forbids both, and this is the table where
 * somebody decides whether a move is worth a walk: "move #40 from #8 to zone #7"
 * is not a decision anybody can make.
 *
 * Driven from the page rather than from the cells, because a cell that renders a
 * name while nothing mounts it is the same defect in a nicer font.
 */

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  }),
}));

const approve = jest.fn();
const rules: SlottingRule[] = [];
const recommendations: SlottingRecommendation[] = [];
let rulesError: Error | null = null;

jest.mock("@/hooks/api/inventory/slotting-labor", () => ({
  useSlottingRules: () => ({
    data: rules,
    isLoading: false,
    isError: rulesError !== null,
    error: rulesError,
    refetch: jest.fn(),
  }),
  useSlottingRecommendations: () => ({
    data: recommendations,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useDismissRecommendation: () => ({ mutate: jest.fn(), isPending: false }),
  useApproveRecommendation: () => ({ mutate: approve, isPending: false }),
  useCreateSlottingRule: () => ({ mutate: jest.fn(), isPending: false }),
  useSetSlottingRuleActive: () => ({ mutate: jest.fn(), isPending: false }),
}));

const categories = [
  { id: 12, orgId: "org", name: "Power tools", parentCategoryId: null, description: null, isActive: true },
];

jest.mock("@/hooks/api/inventory/products", () => ({
  useCategories: () => ({ data: categories, isLoading: false }),
  useProductVariants: () => ({
    data: [
      {
        id: 40,
        productId: 3,
        productName: "Impact driver",
        name: "18V",
        sku: "ID-18V",
        costPrice: "0.0000",
        isActive: true,
      },
    ],
    isLoading: false,
  }),
}));

const base = {
  orgId: "org",
  warehouseId: 5,
  isPickable: true,
  isReceivable: true,
  isSellable: true,
  capacity: null,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

/**
 * Two zones, a bin under each. The second exists purely so the picker can be
 * shown NOT to offer it: `approve()` on the server checks only that a location
 * is visible to the caller, not that it sits under the zone the recommendation
 * is about, so scoping is entirely this control's job.
 */
const locations = [
  { ...base, id: 7, parentLocationId: null, name: "Gold zone", code: "GOLD", locationType: "ZONE" as const },
  { ...base, id: 8, parentLocationId: 7, name: "Bin G-01", code: "G01", locationType: "BIN" as const },
  { ...base, id: 10, parentLocationId: null, name: "Bulk zone", code: "BULK", locationType: "ZONE" as const },
  { ...base, id: 11, parentLocationId: 10, name: "Bin B-01", code: "B01", locationType: "BIN" as const },
];

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useWarehouses: () => ({
    data: [{ id: 5, name: "Leeds DC", code: "LDS" }],
    isLoading: false,
  }),
  useLocations: (warehouseId: number) => ({
    data: warehouseId === 5 ? locations : [],
    isLoading: false,
  }),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
});

beforeEach(() => {
  approve.mockClear();
  rules.length = 0;
  recommendations.length = 0;
  rulesError = null;
});

function renderPage(): void {
  renderWithProviders(
    <TooltipProvider>
      <SlottingPage />
    </TooltipProvider>,
  );
}

const categoryRule: SlottingRule = {
  id: 1,
  warehouseId: 5,
  name: "Power tools to gold",
  matchType: "CATEGORY",
  velocityClass: null,
  categoryId: 12,
  productVariantId: null,
  targetZoneLocationId: 7,
  targetLocationType: "BIN",
  priority: 100,
  isActive: true,
};

const recommendation: SlottingRecommendation = {
  id: 2,
  warehouseId: 5,
  productVariantId: 40,
  fromLocationId: 11,
  toZoneLocationId: 7,
  quantity: "12",
  ruleId: 1,
  reason: "Class A standing in a bulk zone",
  status: "PENDING",
  createdAt: "2026-09-01T00:00:00.000Z",
};

it("names the category, the warehouse and the zone a rule points at", () => {
  rules.push(categoryRule);
  renderPage();

  expect(screen.getByText("Power tools")).toBeInTheDocument();
  expect(screen.getByText("Leeds DC")).toBeInTheDocument();
  expect(screen.getByText("Gold zone · GOLD")).toBeInTheDocument();
  expect(screen.queryByText(/category #12/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/zone #7/i)).not.toBeInTheDocument();
});

/**
 * A blank would read as "no category", which is the one claim that is never true
 * here — the rule names a category, the catalogue no longer has it.
 */
it("says a referenced row is gone rather than falling back to its id", () => {
  rules.push({ ...categoryRule, categoryId: 999 });
  renderPage();

  expect(screen.getByText(/no longer in the catalogue/i)).toBeInTheDocument();
  expect(screen.queryByText(/999/)).not.toBeInTheDocument();
});

it("names the variant and both locations on a re-slot recommendation", () => {
  recommendations.push(recommendation);
  renderPage();

  expect(screen.getByText("Impact driver — 18V")).toBeInTheDocument();
  expect(screen.getByText("Bin B-01 · B01")).toBeInTheDocument();
  expect(screen.getByText("Gold zone · GOLD")).toBeInTheDocument();
});

it("replaces the bin-id text box with a picker scoped to the target zone", async () => {
  recommendations.push(recommendation);
  renderPage();

  expect(screen.queryByPlaceholderText(/bin id/i)).not.toBeInTheDocument();

  await userEvent.click(
    screen.getByRole("combobox", { name: /destination under the target zone/i }),
  );
  const list = await screen.findByRole("listbox");

  expect(within(list).getByText("Bin G-01 · G01")).toBeInTheDocument();
  expect(within(list).getByText("Gold zone · GOLD")).toBeInTheDocument();
  expect(within(list).queryByText(/bin b-01/i)).not.toBeInTheDocument();
  expect(within(list).queryByText(/bulk zone/i)).not.toBeInTheDocument();
});

it("approves with the location the picker chose", async () => {
  recommendations.push(recommendation);
  renderPage();

  await userEvent.click(
    screen.getByRole("combobox", { name: /destination under the target zone/i }),
  );
  await userEvent.click(await screen.findByText("Bin G-01 · G01"));
  await userEvent.click(screen.getByRole("button", { name: /^approve$/i }));

  await waitFor(() => expect(approve).toHaveBeenCalledTimes(1));
  expect(approve).toHaveBeenCalledWith(
    { recommendationId: 2, toLocationId: 8 },
    expect.anything(),
  );
});

/**
 * §4: every error string goes through `getErrorMessage`. The hardcoded sentence
 * this replaces described the request rather than the refusal, so a validation
 * failure — which `getErrorMessage` now unpacks field by field — arrived as
 * "An error occurred while fetching rules".
 */
it("shows the server's own account of the failure", () => {
  rulesError = new Error("targetZoneLocationId: Expected number, received string");
  renderPage();

  expect(
    screen.getByText(/targetZoneLocationId: Expected number, received string/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/an error occurred while fetching rules/i)).not.toBeInTheDocument();
});
