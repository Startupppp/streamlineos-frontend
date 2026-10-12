import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductSettingsPage } from "./product-settings-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/settings",
  useSearchParams: () => new URLSearchParams(""),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => true, usePermissionGate: () => ({ allowed: true, isLoading: false }) }));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: () => ({ kind: "ready" }) }));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/hooks/api/build/managed-products", () => ({ useManagedProduct: jest.fn() }));
jest.mock("@/hooks/api/build/managed-product-mutations", () => ({
  useUpdateManagedProduct: jest.fn(),
  useArchiveManagedProduct: () => ({ mutate: jest.fn(), isPending: false }),
  useRestoreManagedProduct: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("./product-settings-members-section", () => ({
  ProductSettingsMembersSection: () => null,
}));
jest.mock("@/hooks/api/build/managed-product-members", () => ({
  useManagedProductMembers: jest.fn(() => ({ data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 50 } }, isLoading: false })),
  useAddManagedProductMember: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRemoveManagedProductMember: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));
jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(() => ({ data: undefined, isLoading: false })),
}));
jest.mock("@/hooks/api/build/managed-product-summary", () => ({
  useManagedProductSummary: jest.fn(() => ({ data: { delivery: { linkedProjects: 0 } } })),
}));
jest.mock("@/components/shared/dirty-state-context", () => ({
  DirtyStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRegisterDirtyState: jest.fn(),
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/components/members/member-picker", () => ({ MemberPicker: () => null }));
jest.mock("@/features/recruitment/jobs/create-job-form/chip-input", () => ({ ChipInput: () => null }));

const { useManagedProduct: mockUseManagedProduct } = jest.requireMock(
  "@/hooks/api/build/managed-products",
) as { useManagedProduct: jest.Mock };
const { useUpdateManagedProduct: mockUseUpdateManagedProduct } = jest.requireMock(
  "@/hooks/api/build/managed-product-mutations",
) as { useUpdateManagedProduct: jest.Mock };

const mockMutate = jest.fn();
const BASE_PRODUCT = {
  id: 7,
  orgId: "org-1",
  name: "Test Product",
  key: "TP",
  description: "Original description",
  missionStatement: null,
  status: "active",
  ownerId: null,
  version: 3,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  segments: [],
  tags: [],
  successMetrics: [],
  allowedActions: ["update"],
};

function serve(product: Omit<typeof BASE_PRODUCT, "missionStatement"> & { missionStatement: string | null }) {
  mockUseManagedProduct.mockReturnValue({
    data: product,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

function description() {
  return screen.getByLabelText(/Description/);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseUpdateManagedProduct.mockReturnValue({ mutate: mockMutate, isPending: false });
  serve(BASE_PRODUCT);
});

describe("ProductSettingsPage — concurrent update while editing", () => {
  it("keeps unsaved edits and saves against the version the edit started from", async () => {
    const { rerender } = render(<ProductSettingsPage managedProductId={7} />);
    fireEvent.change(description(), { target: { value: "My unsaved edit" } });

    serve({ ...BASE_PRODUCT, version: 4, missionStatement: "Saved elsewhere" });
    rerender(<ProductSettingsPage managedProductId={7} />);

    expect(description()).toHaveValue("My unsaved edit");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
    expect(mockMutate.mock.calls[0][0]).toEqual(
      expect.objectContaining({ version: 3, description: "My unsaved edit" }),
    );
  });

  it("adopts a newer server copy when there are no unsaved edits", async () => {
    const { rerender } = render(<ProductSettingsPage managedProductId={7} />);

    serve({ ...BASE_PRODUCT, version: 4, description: "Saved elsewhere" });
    rerender(<ProductSettingsPage managedProductId={7} />);

    await waitFor(() => expect(description()).toHaveValue("Saved elsewhere"));
    fireEvent.change(description(), { target: { value: "Fresh edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
    expect(mockMutate.mock.calls[0][0]).toEqual(expect.objectContaining({ version: 4 }));
  });
});
