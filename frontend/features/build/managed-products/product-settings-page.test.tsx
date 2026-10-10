import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { ProductSettingsPage } from "./product-settings-page";
import {
  createManagedProductSchema,
  editManagedProductSchema,
} from "./managed-product-schema";

const mockUseManagedProduct = jest.fn();
const mockUseUpdateManagedProduct = jest.fn();
const mockUseArchiveManagedProduct = jest.fn();
const mockUseRestoreManagedProduct = jest.fn();
const mockUsePageState = jest.fn();
const mockUseCan = jest.fn(() => true);
const mockUseManagedProductMembers = jest.fn();
const mockUseAddManagedProductMember = jest.fn();
const mockUseRemoveManagedProductMember = jest.fn();
const mockUseManagedProductReleases = jest.fn();
const mockUseCreateManagedProductRelease = jest.fn();
const mockUseUpdateManagedProductRelease = jest.fn();
const mockUseBuildMembers = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/settings",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: mockUseCan,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: mockUsePageState,
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
  useManagedProduct: mockUseManagedProduct,
}));

jest.mock("@/hooks/api/build/managed-product-mutations", () => ({
  useUpdateManagedProduct: mockUseUpdateManagedProduct,
  useArchiveManagedProduct: mockUseArchiveManagedProduct,
  useRestoreManagedProduct: mockUseRestoreManagedProduct,
}));

jest.mock("@/hooks/api/build/managed-product-members", () => ({
  useManagedProductMembers: mockUseManagedProductMembers,
  useAddManagedProductMember: mockUseAddManagedProductMember,
  useRemoveManagedProductMember: mockUseRemoveManagedProductMember,
}));

jest.mock("@/hooks/api/build/managed-product-releases", () => ({
  useManagedProductReleases: mockUseManagedProductReleases,
  useCreateManagedProductRelease: mockUseCreateManagedProductRelease,
  useUpdateManagedProductRelease: mockUseUpdateManagedProductRelease,
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: mockUseBuildMembers,
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  DirtyStateProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <div data-testid="page-wrapper" data-title={title}>
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
const EMPTY_RELEASES = { data: [], pagination: { limit: 20, hasMore: false, nextCursor: null } };

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
  mockUseManagedProductReleases.mockReturnValue({ data: EMPTY_RELEASES, isLoading: false });
  mockUseCreateManagedProductRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateManagedProductRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildMembers.mockReturnValue({ data: { data: [], pagination: { hasMore: false, nextCursor: null } } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  setupDefaultMocks();
});

describe("ProductSettingsPage — sections render", () => {
  it("renders the identity & strategy section heading", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByText("Identity, strategy & lifecycle")).toBeInTheDocument();
  });

  it("renders the members section heading", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByText("Members")).toBeInTheDocument();
  });

  it("renders the releases section heading", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByText("Releases")).toBeInTheDocument();
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
    mockUseCan.mockImplementation((key: string) => key !== "build:managed-products:update");
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /add member/i })).not.toBeInTheDocument();
  });

  it("hides Add release button when canUpdate is false", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:managed-products:update");
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.queryByRole("button", { name: /add release/i })).not.toBeInTheDocument();
  });

  it("renders NoPermissionState when page state is denied", () => {
    mockUsePageState.mockReturnValue({ kind: "denied", permission: "build:managed-products:view" });
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});

describe("ProductSettingsPage — members", () => {
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

describe("ProductSettingsPage — releases", () => {
  it("renders existing releases", () => {
    mockUseManagedProductReleases.mockReturnValue({
      data: {
        data: [
          {
            id: 20,
            orgId: "org-1",
            managedProductId: 7,
            name: "v1.0.0",
            version: "1.0.0",
            description: null,
            status: "released",
            releaseDate: "2024-06-01",
            createdBy: null,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
    });
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
  });

  it("shows Add release button when canUpdate is true", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    expect(screen.getByRole("button", { name: /add release/i })).toBeInTheDocument();
  });
});

describe("ProductSettingsPage — archive confirm", () => {
  it("opens archive confirm dialog when Archive button is clicked", () => {
    render(<ProductSettingsPage managedProductId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("managed-product schemas — validation limits", () => {
  it("rejects tags array longer than 20 items", () => {
    const result = createManagedProductSchema.safeParse({
      name: "P",
      key: "K",
      description: "",
      ownerId: "",
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tag value longer than 40 characters", () => {
    const result = createManagedProductSchema.safeParse({
      name: "P",
      key: "K",
      description: "",
      ownerId: "",
      tags: ["a".repeat(41)],
    });
    expect(result.success).toBe(false);
  });

  it("rejects segments array longer than 20 items", () => {
    const result = createManagedProductSchema.safeParse({
      name: "P",
      key: "K",
      description: "",
      ownerId: "",
      segments: Array.from({ length: 21 }, (_, i) => `seg${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects successMetrics array longer than 10 items", () => {
    const result = editManagedProductSchema.safeParse({
      name: "P",
      description: "",
      ownerId: "",
      status: "active",
      successMetrics: Array.from({ length: 11 }, (_, i) => ({ label: `m${i}` })),
    });
    expect(result.success).toBe(false);
  });

  it("accepts 20 tags each at most 40 chars", () => {
    const result = createManagedProductSchema.safeParse({
      name: "P",
      key: "K",
      description: "",
      ownerId: "",
      tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(true);
  });
});
