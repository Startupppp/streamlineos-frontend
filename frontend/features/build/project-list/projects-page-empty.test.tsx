import { render, screen } from "@testing-library/react";
import { ProjectsPage } from "./projects-page";

const infiniteProjects = jest.fn();
const project = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useModuleEnabled: () => true,
  useAccess: () => ({ data: undefined, isLoading: false, isError: false }),
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
  project.mockReturnValue({ data: undefined, isError: false, error: null });
  infiniteProjects.mockReturnValue({
    data: { pages: [{ data: [], hasMore: false, nextCursor: null }], pageParams: [undefined] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  });
});

describe("the Build projects page with nothing in it", () => {
  it("renders the first-project empty state instead of erroring when the org owns no projects", () => {
    expect(() => render(<ProjectsPage />)).not.toThrow();
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });
});
