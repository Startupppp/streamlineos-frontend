import "./managed-products-page.test-fixtures";
import { render } from "@testing-library/react";
import { ManagedProductsPage } from "./managed-products-page";
import type { CreateManagedProductInput } from "@/types/projects";
import {
  mockUseBuildListFilters,
  mockSearchParams,
  useManagedProducts,
  ManagedProductFormSheet,
  useCreateManagedProduct,
  useDeleteManagedProduct,
  toast,
  useQueryParamOpen,
} from "./managed-products-page.test-fixtures";
import { FILTER_DEFINITIONS } from "./managed-products-filter-constants";

type MutateCallbacks = { onSuccess?: () => void; onError?: (e: Error) => void };

describe("ManagedProductsPage — create product (BT-6733af0a3e35 item 1)", () => {
  const INPUT: CreateManagedProductInput = { name: "Omega Suite", key: "OMEGA-001" };
  let capturedMutate: jest.Mock;
  let capturedCallbacks: MutateCallbacks;

  beforeEach(() => {
    capturedCallbacks = {};
    capturedMutate = jest.fn((_input: CreateManagedProductInput, cbs: MutateCallbacks) => {
      capturedCallbacks = cbs;
    });
    useCreateManagedProduct.mockReturnValue({ mutate: capturedMutate, isPending: false });
    useQueryParamOpen.mockReturnValue({ open: true, onOpenChange: jest.fn(), setOpen: jest.fn() });
    ManagedProductFormSheet.mockImplementation(
      ({ onSubmitCreate }: { onSubmitCreate?: (i: CreateManagedProductInput) => void }) => {
        onSubmitCreate?.(INPUT);
        return null;
      },
    );
  });

  it("fires createProduct.mutate with the submitted input when the form calls onSubmitCreate", () => {
    render(<ManagedProductsPage />);
    expect(capturedMutate).toHaveBeenCalledWith(INPUT, expect.any(Object));
  });

  it("shows success toast and closes the create form on mutation success", () => {
    render(<ManagedProductsPage />);
    expect(capturedMutate).toHaveBeenCalledTimes(1);
    capturedCallbacks.onSuccess?.();
    expect(toast.success).toHaveBeenCalledWith("Managed product created");
  });

  it("shows error toast and leaves the create form open on mutation failure", () => {
    render(<ManagedProductsPage />);
    expect(capturedMutate).toHaveBeenCalledTimes(1);
    capturedCallbacks.onError?.(new Error("Name taken"));
    expect(toast.error).toHaveBeenCalledWith("Name taken");
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("ManagedProductsPage — delete product (BT-6733af0a3e35 item 1)", () => {
  const product = {
    id: 55, name: "Delete Me", key: "DEL-055", status: "active" as const,
    ownerId: null, description: null, orgId: "org-1", vision: null, missionStatement: null,
    targetCustomer: null, differentiators: null, currentPhase: null, targetLaunchDate: null,
    successMetrics: null, ownerMembershipId: null, deletedAt: null,
    createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z",
  };

  it("does not call deleteProduct.mutate before the confirmation step", () => {
    const mockDeleteMutate = jest.fn();
    useDeleteManagedProduct.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
    useManagedProducts.mockReturnValue({
      data: { data: [product], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });
    render(<ManagedProductsPage />);
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });
});

describe("ManagedProductsPage — owner filter (BSN-MP-OWNER)", () => {
  it("passes ownerId to useManagedProducts when the owner filter is active", () => {
    mockUseBuildListFilters.mockReturnValue({
      value: (param: string) => (param === "ownerId" ? "user-123" : "all"),
      isActive: (param: string) => param === "ownerId",
      setValue: jest.fn(),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      resetKey: "ownerId=user-123",
      isPending: false,
      isFiltered: true,
      activeCount: 1,
      cursor: null,
      setCursor: jest.fn(),
    });
    render(<ManagedProductsPage />);
    expect(useManagedProducts).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "user-123" }),
    );
  });

  it("omits a non-numeric team or project id and a blank segment so an illegal URL does not 400 the list", () => {
    mockUseBuildListFilters.mockReturnValue({
      value: (param: string) => {
        if (param === "teamId") return "not-a-team";
        if (param === "linkedProjectId") return "nope";
        if (param === "segment") return "  ";
        if (param === "tag") return " ";
        if (param === "ownerId") return "user-123";
        return "all";
      },
      isActive: () => false,
      setValue: jest.fn(),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      resetKey: "teamId=not-a-team",
      isPending: false,
      isFiltered: true,
      activeCount: 1,
      cursor: null,
      setCursor: jest.fn(),
    });
    render(<ManagedProductsPage />);
    expect(useManagedProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "user-123",
        teamId: undefined,
        linkedProjectId: undefined,
        segment: undefined,
        tag: undefined,
      }),
    );
  });

  it("passes archived=true to useManagedProducts when the archived filter is set", () => {
    mockUseBuildListFilters.mockReturnValue({
      value: (param: string) => (param === "archived" ? "true" : "all"),
      isActive: (param: string) => param === "archived",
      setValue: jest.fn(),
      clearAll: jest.fn(),
      search: "",
      debouncedSearch: "",
      setSearch: jest.fn(),
      resetKey: "archived=true",
      isPending: false,
      isFiltered: true,
      activeCount: 1,
      cursor: null,
      setCursor: jest.fn(),
    });
    render(<ManagedProductsPage />);
    expect(useManagedProducts).toHaveBeenCalledWith(
      expect.objectContaining({ archived: true }),
    );
  });
});

describe("ManagedProductsPage — view mode outside filter definitions (BSN-MP-VIEW)", () => {
  it("FILTER_DEFINITIONS does not contain a view entry so clearAll cannot reset the layout toggle", () => {
    const params = FILTER_DEFINITIONS.map((d) => d.param);
    expect(params).not.toContain("view");
  });

  it("useManagedProducts is called without a view param when view=grid is in the URL so the toggle is UI-only", () => {
    mockSearchParams.string = "view=grid";
    render(<ManagedProductsPage />);
    const calls = useManagedProducts.mock.calls;
    for (const [args] of calls) {
      expect(args).not.toHaveProperty("view");
    }
  });

  it("useManagedProducts is called with the same params regardless of view mode so the toggle does not affect server filtering", () => {
    mockSearchParams.string = "";
    render(<ManagedProductsPage />);
    const tableCall = useManagedProducts.mock.calls[0]?.[0] as Record<string, unknown>;

    jest.clearAllMocks();
    useManagedProducts.mockReturnValue({
      data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
      isLoading: false, isError: false, error: null, refetch: jest.fn(),
    });

    mockSearchParams.string = "view=grid";
    render(<ManagedProductsPage />);
    const gridCall = useManagedProducts.mock.calls[0]?.[0] as Record<string, unknown>;

    const { view: _tv, ...tableRest } = tableCall ?? {};
    const { view: _gv, ...gridRest } = gridCall ?? {};
    expect(gridRest).toEqual(tableRest);
  });
});
