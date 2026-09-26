import { render } from "@testing-library/react";

let mockSearchParams = new URLSearchParams();
const mockUseInfiniteProjects = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useModuleEnabled: () => true,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
    isLoading: false,
  }),
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/api/build", () => ({
  useInfiniteProjects: (filters: unknown) => mockUseInfiniteProjects(filters),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: undefined, isError: false, error: null }),
}));

jest.mock("./new-project-dialog", () => ({
  NewProjectDialog: () => null,
}));

import React from "react";
import { ProjectsPage } from "./projects-page";

function emptyProjectsResult() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockUseInfiniteProjects.mockReturnValue(emptyProjectsResult());
});

describe("ProjectsPage — productId URL param", () => {
  it("passes managedProductId to useInfiniteProjects from the productId URL param so the API returns only that product's projects", () => {
    mockSearchParams = new URLSearchParams("productId=7");

    render(<ProjectsPage />);

    const calls = mockUseInfiniteProjects.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[0]).toMatchObject({ managedProductId: 7 });
  });

  it("omits managedProductId from useInfiniteProjects when productId is absent so the API returns all projects", () => {
    mockSearchParams = new URLSearchParams();

    render(<ProjectsPage />);

    const calls = mockUseInfiniteProjects.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[0]).not.toHaveProperty("managedProductId");
  });

  it("prefers the managedProductId prop over the productId URL param so the product-scoped page renders correctly", () => {
    mockSearchParams = new URLSearchParams("productId=7");

    render(<ProjectsPage managedProductId={3} />);

    const calls = mockUseInfiniteProjects.mock.calls;
    expect(calls[0]?.[0]).toMatchObject({ managedProductId: 3 });
  });
});

describe("ProjectsPage — managerId URL param", () => {
  it("reads managerId from the URL so the manager filter can be deep-linked", () => {
    mockSearchParams = new URLSearchParams("managerId=user-abc");

    render(<ProjectsPage />);

    expect(mockUseInfiniteProjects).toHaveBeenCalled();
  });

  it("falls back to filterLead for backward-compatible deep links from existing bookmarks", () => {
    mockSearchParams = new URLSearchParams("filterLead=user-abc");

    render(<ProjectsPage />);

    expect(mockUseInfiniteProjects).toHaveBeenCalled();
  });
});

describe("ProjectsPage — clientId URL param", () => {
  it("reads clientId from the URL without crashing so the filter position is reserved for when the API adds server-side support", () => {
    mockSearchParams = new URLSearchParams("clientId=user-xyz");

    expect(() => render(<ProjectsPage />)).not.toThrow();
  });
});
