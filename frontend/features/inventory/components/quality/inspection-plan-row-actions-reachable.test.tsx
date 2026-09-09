import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import InspectionPlansPage from "@/app/(authenticated)/inventory/quality/plans/page";

/**
 * `PATCH /inventory/quality/inspection-plans/:planId` and its `DELETE` twin were
 * permissioned, versioned and wrapped in hooks nobody called. A plan created
 * with the wrong name, the wrong trigger, or by mistake could be opened and its
 * versions published — but the plan itself could never be corrected or retired.
 *
 * Testing the menu on its own would have passed while nothing mounted it, which
 * is the defect rather than the proof. This renders the page a quality manager
 * actually opens and walks to the two controls from there.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/quality/plans",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/inventory/products", () => ({
  useCategories: () => ({ data: [], isLoading: false }),
}));

const idleMutation = { mutate: jest.fn(), isPending: false };

const plan = {
  id: 12,
  code: "INBOUND-ELECTRONICS",
  name: "Electronics intake check",
  description: "Vendor cartons are opened before they become available.",
  productVariantId: null,
  productId: null,
  categoryId: null,
  appliesOnReceipt: true,
  appliesOnReturn: false,
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  activeVersion: { id: 5, version: 1, samplingMethod: "ALL" as const, sampleValue: null },
  scopeLabel: "All products",
};

jest.mock("@/hooks/api/inventory/inspection-plans", () => ({
  ...jest.requireActual("@/hooks/api/inventory/inspection-plans"),
  useInspectionPlans: () => ({
    data: { items: [plan], total: 1, page: 1, totalPages: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useInspectionPlan: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useCreateInspectionPlan: () => idleMutation,
  useUpdateInspectionPlan: () => idleMutation,
  useDeleteInspectionPlan: () => idleMutation,
  useCreatePlanVersion: () => idleMutation,
  useActivatePlanVersion: () => idleMutation,
}));

/** The shell mounts `TooltipProvider` once, in `components/providers/query-provider.tsx`. */
async function openRowMenu(): Promise<void> {
  renderWithProviders(
    <TooltipProvider>
      <InspectionPlansPage />
    </TooltipProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: /actions for electronics intake check/i }),
  );
}

it("puts edit and retire on the plan row a quality manager opens", async () => {
  await openRowMenu();

  expect(await screen.findByRole("menuitem", { name: /edit plan/i })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /retire plan/i })).toBeInTheDocument();
});

it("opens the edit form on the plan the row belongs to", async () => {
  await openRowMenu();
  await userEvent.click(await screen.findByRole("menuitem", { name: /edit plan/i }));

  expect(await screen.findByRole("dialog")).toHaveTextContent("Edit inspection plan");
  expect(screen.getByLabelText(/^name$/i)).toHaveValue("Electronics intake check");
});

it("asks before retiring, and says what survives", async () => {
  await openRowMenu();
  await userEvent.click(await screen.findByRole("menuitem", { name: /retire plan/i }));

  const confirm = await screen.findByRole("alertdialog");
  expect(confirm).toHaveTextContent("Retire Electronics intake check?");
  expect(confirm).toHaveTextContent(/keep their verdict/i);
});
