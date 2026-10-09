import { render, screen } from "@testing-library/react";
import { ProjectsPage } from "./projects-page";

const projects = jest.fn();
const project = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/projects",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useModuleEnabled: () => true,
  useAccess: () => ({
    data: { isOrgOwner: true, scopes: {}, modules: {} },
    isLoading: false,
  }),
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProjects: () => projects(),
  useProject: () => project(),
}));

jest.mock("./new-project-dialog", () => ({
  NewProjectDialog: () => <div data-testid="new-project-dialog" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  project.mockReturnValue({ data: undefined, isError: false, error: null });
  projects.mockReturnValue({
    data: { data: [], hasMore: false, nextCursor: null },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isFetching: false,
  });
});

describe("the Build projects page with nothing in it", () => {
  it("renders the first-project empty state instead of erroring when the org owns no projects", () => {
    expect(() => render(<ProjectsPage />)).not.toThrow();
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("uses the full-height managed-product detail body for linked-projects empty state", () => {
    const { container } = render(<ProjectsPage managedProductId={7} />);
    const detailShell = Array.from(container.querySelectorAll("div")).find(
      (element) =>
        element.classList.contains("relative") &&
        element.classList.contains("h-full") &&
        element.classList.contains("flex-1"),
    );

    expect(detailShell).toBeDefined();
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("keeps pagination available when client-side visibility removes every row on a page that has more", () => {
    projects.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            name: "Archived project",
            description: null,
            key: "ARCH",
            status: "ARCHIVED",
            priority: null,
            health: "on_track",
            managedProductId: null,
            startDate: null,
            endDate: null,
            manager: null,
            progress: { total: 0, done: 0, percentage: 0 },
            members: [],
            teams: [],
          },
        ],
        hasMore: true,
        nextCursor: 1,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
    });

    render(<ProjectsPage />);

    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(screen.queryByText("No projects match your filters")).not.toBeInTheDocument();
  });
});
