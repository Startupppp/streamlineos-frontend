import { render } from "@testing-library/react";
import { ManagedProductOverviewPage } from "./managed-product-overview-page";

const usePageState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/42",
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(() => ({
    value: jest.fn(() => undefined),
    setValue: jest.fn(),
    isActive: jest.fn(() => false),
    clearAll: jest.fn(),
  })),
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProduct: jest.fn(() => ({
    data: { id: 42, name: "Payments Platform", key: "PAY", description: null, vision: null },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  useManagedProductInsights: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/goals", () => ({
  useGoalsPage: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("ManagedProductOverviewPage — URL-backed ownerId/status/cursor (BSN-OVW-PARAMS)", () => {
  it("forwards ownerId URL param as managerId to useProjects so projects are filtered by owner server-side", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "ownerId" ? "user-abc" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ managerId: "user-abc" }),
      expect.anything(),
    );
  });

  it("forwards status URL param to useProjects when it is a recognised project status value", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "status" ? "ACTIVE" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ACTIVE" }),
      expect.anything(),
    );
  });

  it("passes undefined status when the URL value is not a recognised project status so unrecognised values do not reach the backend", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "status" ? "unknown-value" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
      expect.anything(),
    );
  });

  it("parses the cursor URL param as an integer and passes it as afterId to useProjects", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn((key: string) => (key === "cursor" ? "55" : undefined)),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ afterId: 55 }),
      expect.anything(),
    );
  });

  it("passes undefined afterId when cursor param is absent so the first page is shown by default", () => {
    const { useBuildListFilters } = jest.requireMock("@/features/build/shared/use-build-list-filters");
    (useBuildListFilters as jest.Mock).mockReturnValue({
      value: jest.fn(() => undefined),
      setValue: jest.fn(),
      isActive: jest.fn(() => false),
      clearAll: jest.fn(),
    });
    const { useProjects } = jest.requireMock("@/hooks/api/build/projects");
    render(<ManagedProductOverviewPage managedProductId={42} />);
    expect(useProjects).toHaveBeenCalledWith(
      expect.objectContaining({ afterId: undefined }),
      expect.anything(),
    );
  });
});
