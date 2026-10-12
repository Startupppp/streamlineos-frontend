import { fireEvent, render, screen } from "@testing-library/react";
import { ProductSettingsPage } from "./product-settings-page";

const mockReplace = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/settings",
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  usePermissionGate: jest.fn(() => ({ allowed: true, isLoading: false })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "denied") return <div data-testid="no-permission" />;
    if (resolution.kind === "error") return <div data-testid="error-state" />;
    return <div data-testid="page-ready">{children}</div>;
  },
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: jest.fn(),
}));

jest.mock("@/hooks/api/build/managed-product-mutations", () => ({
  useUpdateManagedProduct: jest.fn(),
  useArchiveManagedProduct: jest.fn(),
  useRestoreManagedProduct: jest.fn(),
}));

jest.mock("@/hooks/api/build/managed-product-members", () => ({
  useManagedProductMembers: jest.fn(),
  useAddManagedProductMember: jest.fn(),
  useRemoveManagedProductMember: jest.fn(),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: jest.fn(),
}));

jest.mock("@/hooks/api/build/managed-product-projects", () => ({
  useManagedProductProjects: jest.fn(),
}));

const { useCan: mockUseCan } = jest.requireMock("@/hooks/api/access") as { useCan: jest.Mock };
const { usePageState: mockUsePageState } = jest.requireMock("@/hooks/api/use-page-state") as { usePageState: jest.Mock };
const { useManagedProduct: mockUseManagedProduct } = jest.requireMock("@/hooks/api/build/managed-products") as { useManagedProduct: jest.Mock };
const {
  useUpdateManagedProduct: mockUseUpdateManagedProduct,
  useArchiveManagedProduct: mockUseArchiveManagedProduct,
  useRestoreManagedProduct: mockUseRestoreManagedProduct,
} = jest.requireMock("@/hooks/api/build/managed-product-mutations") as {
  useUpdateManagedProduct: jest.Mock;
  useArchiveManagedProduct: jest.Mock;
  useRestoreManagedProduct: jest.Mock;
};
const {
  useManagedProductMembers: mockUseManagedProductMembers,
  useAddManagedProductMember: mockUseAddManagedProductMember,
  useRemoveManagedProductMember: mockUseRemoveManagedProductMember,
} = jest.requireMock("@/hooks/api/build/managed-product-members") as {
  useManagedProductMembers: jest.Mock;
  useAddManagedProductMember: jest.Mock;
  useRemoveManagedProductMember: jest.Mock;
};
const { useBuildMembers: mockUseBuildMembers } = jest.requireMock("@/hooks/api/build/build-members") as { useBuildMembers: jest.Mock };
const { useManagedProductProjects: mockUseManagedProductProjects } = jest.requireMock("@/hooks/api/build/managed-product-projects") as { useManagedProductProjects: jest.Mock };

jest.mock("@/components/shared/dirty-state-context", () => ({
  DirtyStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
    filters,
  }: {
    children: React.ReactNode;
    title: string;
    filters?: React.ReactNode;
  }) => (
    <div data-testid="page-wrapper" data-title={title}>
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: jest.fn((e: unknown) => String(e)),
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => <div data-testid="member-picker" />,
}));

jest.mock("@/features/recruitment/jobs/create-job-form/chip-input", () => ({
  ChipInput: () => <div data-testid="chip-input" />,
}));

const MOCK_PRODUCT = {
  id: 7,
  orgId: "org-1",
  name: "Test Product",
  key: "TP",
  description: "A test product",
  status: "active",
  ownerId: "user-1",
  version: 3,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  lifecycle: "build" as const,
  health: "on_track" as const,
  segments: ["enterprise"],
  tags: ["core"],
  successMetrics: [],
};

const EMPTY_MEMBERS = { data: [] };

function setupDefaultMocks() {
  mockUseManagedProduct.mockReturnValue({
    data: MOCK_PRODUCT,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseUpdateManagedProduct.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseArchiveManagedProduct.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseRestoreManagedProduct.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseManagedProductMembers.mockReturnValue({ data: EMPTY_MEMBERS, isLoading: false });
  mockUseAddManagedProductMember.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseRemoveManagedProductMember.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildMembers.mockReturnValue({ data: { data: [], pagination: { hasMore: false, nextCursor: null } } });
  mockUseManagedProductProjects.mockReturnValue({ data: undefined, isLoading: false });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearch = "";
  mockUseCan.mockReturnValue(true);
  setupDefaultMocks();
});

describe("ProductSettingsPage — sections render", () => {
  it("renders the identity & strategy section heading", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByText("Identity, strategy & lifecycle")).toBeInTheDocument();
  });

  it("renders the members section heading", () => {
    mockSearch = "tab=members";
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("heading", { name: "Members" })).toBeInTheDocument();
  });

  it("renders the danger zone section heading", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByText("Danger zone")).toBeInTheDocument();
  });

  it("renders archive button when product is active", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("renders restore button when product is archived", () => {
    mockUseManagedProduct.mockReturnValue({
      data: { ...MOCK_PRODUCT, status: "archived" },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("calls usePageState with build:managed-products:view", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:managed-products:view" }),
    );
  });
});

describe("ProductSettingsPage — denied / read-only", () => {
  it("hides save button when canUpdate is false", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:managed-products:update");
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
  });

  it("hides Add member button when canUpdate is false", () => {
    mockSearch = "tab=members";
    mockUseCan.mockImplementation((key: string) => key !== "build:managed-products:update");
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
  });

  it("renders NoPermissionState when page state is denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});

describe("ProductSettingsPage — members", () => {
  beforeEach(() => {
    mockSearch = "tab=members";
  });

  it("renders existing members", () => {
    mockUseManagedProductMembers.mockReturnValue({
      data: {
        data: [
          {
            id: 10,
            orgId: "org-1",
            managedProductId: 7,
            organizationMembershipId: 5,
            role: "admin",
            addedAt: "2024-01-01T00:00:00Z",
            member: { id: "user-2", firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
          },
        ],
      },
      isLoading: false,
    });
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("shows Add member button when canUpdate is true", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /add member/i })).toBeInTheDocument();
  });
});

describe("ProductSettingsPage — section tabs", () => {
  it("shows General by default and hides members and releases", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("tab", { name: "General", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Members" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Releases" })).not.toBeInTheDocument();
    expect(screen.getByText("Identity, strategy & lifecycle")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Members" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Releases" })).not.toBeInTheDocument();
  });

  it("falls back to General for a stale tab=releases link", () => {
    mockSearch = "tab=releases";
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("tab", { name: "General", selected: true })).toBeInTheDocument();
    expect(screen.getByText("Identity, strategy & lifecycle")).toBeInTheDocument();
  });

  it("falls back to General when the tab param is unknown", () => {
    mockSearch = "tab=nope";
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("tab", { name: "General", selected: true })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Members" })).not.toBeInTheDocument();
  });

  it("writes the members tab into the url", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Members" }));
    expect(mockReplace).toHaveBeenCalledWith(
      "/build/managed-products/7/settings?tab=members",
      { scroll: false },
    );
  });
});

describe("ProductSettingsPage — archive confirm", () => {
  it("opens archive confirm dialog when Archive button is clicked", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
