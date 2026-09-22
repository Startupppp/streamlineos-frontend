import { render, screen } from "@testing-library/react";
import { ProjectsPage } from "./projects-page";
import { ApiError } from "@/lib/api-envelope";

const infiniteProjects = jest.fn();
const project = jest.fn();
const can = jest.fn();
const access = jest.fn();

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => can(key),
  useModuleEnabled: () => true,
  useAccess: () => access(),
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/api/build", () => ({
  useInfiniteProjects: () => infiniteProjects(),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => project(),
}));

jest.mock("./new-project-dialog", () => ({
  NewProjectDialog: () => <div data-testid="new-project-dialog" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  can.mockReturnValue(false);
  access.mockReturnValue({
    data: { isOrgOwner: false, scopes: {}, modules: {} },
    isLoading: false,
  });
  project.mockReturnValue({ data: undefined, isError: false, error: null });
  infiniteProjects.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  });
});

describe("the Build projects page when the caller lacks build:view", () => {
  it("renders a denied state naming build:view instead of the create-your-first-project empty state", () => {
    render(<ProjectsPage />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText("build:view")).toBeInTheDocument();
    expect(screen.queryByText("No projects yet")).not.toBeInTheDocument();
  });

  it("says nothing about access while the snapshot is still in flight, because useCan answers false before it lands and would flash Access Restricted at a permitted user", () => {
    access.mockReturnValue({ data: undefined, isLoading: true });

    render(<ProjectsPage />);

    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
    expect(screen.queryByText("No projects yet")).not.toBeInTheDocument();
  });

  it("offers the upgrade path the backend sent with a 402 rather than a generic failure", () => {
    access.mockReturnValue({
      data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
      isLoading: false,
    });
    infiniteProjects.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
      refetch: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<ProjectsPage />);

    expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });
});
