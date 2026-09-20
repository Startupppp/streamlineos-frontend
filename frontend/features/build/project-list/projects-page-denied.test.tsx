import { render, screen } from "@testing-library/react";
import { ProjectsPage } from "./projects-page";

const infiniteProjects = jest.fn();
const project = jest.fn();
const can = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => can(key),
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
  can.mockReturnValue(false);
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
});
