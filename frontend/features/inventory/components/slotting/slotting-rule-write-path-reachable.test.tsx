import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import SlottingPage from "@/app/(authenticated)/inventory/slotting/page";
import type { SlottingRule } from "@/hooks/api/inventory/slotting-labor";

/**
 * `POST /inventory/slotting/rules` and `PATCH /inventory/slotting/rules/:ruleId`
 * had no frontend caller at all. The page was a read-only window onto rows only
 * an API client could write, and its empty state named a thing the product could
 * not create.
 *
 * Everything here is driven from the page a planner actually opens. Testing the
 * sheet or the switch on their own would have passed for as long as nothing
 * mounted them, which is the defect rather than the proof.
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

const createRule = jest.fn();
const setRuleActive = jest.fn();
const rules: SlottingRule[] = [];

jest.mock("@/hooks/api/inventory/slotting-labor", () => ({
  useSlottingRules: () => ({
    data: rules,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useSlottingRecommendations: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useDismissRecommendation: () => ({ mutate: jest.fn(), isPending: false }),
  useApproveRecommendation: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateSlottingRule: () => ({ mutate: createRule, isPending: false }),
  useSetSlottingRuleActive: () => ({ mutate: setRuleActive, isPending: false }),
}));

jest.mock("@/hooks/api/inventory/products", () => ({
  useCategories: () => ({
    data: [{ id: 12, orgId: "org", name: "Power tools", parentCategoryId: null, description: null, isActive: true }],
    isLoading: false,
  }),
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

const zone = {
  id: 7,
  orgId: "org",
  warehouseId: 5,
  parentLocationId: null,
  name: "Gold zone",
  code: "GOLD",
  locationType: "ZONE" as const,
  isPickable: false,
  isReceivable: true,
  isSellable: false,
  capacity: null,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  ...jest.requireActual("@/hooks/api/inventory/warehouses"),
  useWarehouses: () => ({
    data: { items: [{ id: 5, name: "Leeds DC", code: "LDS" }], total: 1, page: 1, totalPages: 1 },
    isLoading: false,
  }),
  useLocations: (warehouseId: number) => ({
    data: warehouseId === 5 ? [zone] : [],
    isLoading: false,
  }),
}));

/**
 * jsdom implements no pointer capture, and Radix's Select trigger calls it on
 * pointer-down — so opening one throws rather than opening.
 */
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
});

beforeEach(() => {
  createRule.mockClear();
  setRuleActive.mockClear();
  rules.length = 0;
});

function renderPage(): void {
  renderWithProviders(
    <TooltipProvider>
      <SlottingPage />
    </TooltipProvider>,
  );
}

async function choose(fieldName: RegExp, optionName: RegExp | string): Promise<void> {
  await userEvent.click(screen.getByRole("combobox", { name: fieldName }));
  await userEvent.click(await screen.findByRole("option", { name: optionName }));
}

const liveRule: SlottingRule = {
  id: 1,
  warehouseId: 5,
  name: "Fast movers to gold",
  matchType: "VELOCITY_CLASS",
  velocityClass: "A",
  categoryId: null,
  productVariantId: null,
  targetZoneLocationId: 7,
  targetLocationType: "BIN",
  priority: 100,
  isActive: true,
};

it("offers New rule in the page header, beside a table that already has rows", () => {
  rules.push(liveRule);
  renderPage();

  expect(screen.getByRole("button", { name: /new rule/i })).toBeInTheDocument();
});

/**
 * The whole point of the ticket: the empty state named a thing the product could
 * not create, and offered no way out of itself.
 */
it("makes the empty state's own call to action open the create sheet", async () => {
  renderPage();

  const empty = screen.getByText(/no slotting rules yet/i).closest("div");
  if (empty === null) throw new Error("the empty state rendered no container");
  await userEvent.click(within(empty).getByRole("button", { name: /new rule/i }));

  expect(await screen.findByRole("dialog")).toHaveTextContent("New slotting rule");
});

it("creates a rule from the sheet the header opens", async () => {
  rules.push(liveRule);
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: /new rule/i }));
  await screen.findByRole("dialog");

  await choose(/warehouse/i, "Leeds DC");
  await userEvent.type(screen.getByLabelText(/^name$/i), "Fast movers to gold");
  await choose(/velocity class/i, /the fastest movers/i);
  await choose(/sends to/i, /gold zone/i);
  await userEvent.click(screen.getByRole("button", { name: /create rule/i }));

  await waitFor(() => expect(createRule).toHaveBeenCalledTimes(1));
  expect(createRule).toHaveBeenCalledWith(
    {
      warehouseId: 5,
      name: "Fast movers to gold",
      matchType: "VELOCITY_CLASS",
      velocityClass: "A",
      targetZoneLocationId: 7,
      priority: 100,
    },
    expect.anything(),
  );
});

/**
 * The server's `superRefine` refuses a rule that names two match payloads, so a
 * planner who tries a class, changes their mind and picks a category must not
 * send both — and must not be told their velocity class is wrong for a rule they
 * no longer believe matches on velocity.
 */
it("sends only the payload the chosen match type owns", async () => {
  rules.push(liveRule);
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: /new rule/i }));
  await screen.findByRole("dialog");

  await choose(/warehouse/i, "Leeds DC");
  await userEvent.type(screen.getByLabelText(/^name$/i), "Power tools to gold");
  await choose(/velocity class/i, /the fastest movers/i);
  await choose(/^matches$/i, /a category/i);
  await choose(/^category$/i, "Power tools");
  await choose(/sends to/i, /gold zone/i);
  await userEvent.click(screen.getByRole("button", { name: /create rule/i }));

  await waitFor(() => expect(createRule).toHaveBeenCalledTimes(1));
  const payload: unknown = createRule.mock.calls[0]?.[0];
  expect(payload).toEqual({
    warehouseId: 5,
    name: "Power tools to gold",
    matchType: "CATEGORY",
    categoryId: 12,
    targetZoneLocationId: 7,
    priority: 100,
  });
  expect(payload).not.toHaveProperty("velocityClass");
});

it("puts the on/off control on the rule row itself", () => {
  rules.push(liveRule);
  renderPage();

  expect(screen.getByRole("switch", { name: /turn off fast movers to gold/i })).toBeInTheDocument();
});

/**
 * Off is the direction with the silent blast radius: putaway stops steering the
 * class to its zone while the rule goes on reading as configured in this table.
 */
it("asks before turning a rule off, and says what changes", async () => {
  rules.push(liveRule);
  renderPage();
  await userEvent.click(screen.getByRole("switch", { name: /turn off fast movers to gold/i }));

  const confirm = await screen.findByRole("alertdialog");
  expect(confirm).toHaveTextContent("Turn off Fast movers to gold?");
  expect(confirm).toHaveTextContent(/putaway stops sending this stock to its zone/i);
  expect(setRuleActive).not.toHaveBeenCalled();

  await userEvent.click(within(confirm).getByRole("button", { name: /turn it off/i }));
  await waitFor(() => expect(setRuleActive).toHaveBeenCalledTimes(1));
  expect(setRuleActive).toHaveBeenCalledWith({ ruleId: 1, isActive: false }, expect.anything());
});

/** On restores what the rule already says it does, so it does not ask. */
it("turns a rule back on without a confirmation", async () => {
  rules.push({ ...liveRule, isActive: false });
  renderPage();
  await userEvent.click(screen.getByRole("switch", { name: /turn on fast movers to gold/i }));

  await waitFor(() => expect(setRuleActive).toHaveBeenCalledTimes(1));
  expect(setRuleActive).toHaveBeenCalledWith({ ruleId: 1, isActive: true }, expect.anything());
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});
