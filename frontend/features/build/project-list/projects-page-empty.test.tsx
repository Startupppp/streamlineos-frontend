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
});
