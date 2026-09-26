import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectSettingsViewsPage } from "./project-settings-views-page";

let mockCanManage = true;
let mockQuery: {
  data?: Array<{ id: number; name: string; layoutType: "list" | "board" | "calendar"; isPinned: boolean; ownerId?: string }>;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
} = { data: [], isLoading: false, isError: false };

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } } }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
}));

jest.mock("@/hooks/api/build", () => ({
  useViews: () => ({ ...mockQuery, refetch: jest.fn() }),
  useUpdateView: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteView: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading, isError, isEmpty }: { isLoading: boolean; isError: boolean; isEmpty: boolean }) =>
    isLoading ? "loading" : isError ? "error" : isEmpty ? "empty" : "ready",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, loading, empty, children }: { resolution: string; loading: React.ReactNode; empty: React.ReactNode; children: React.ReactNode }) => {
    if (resolution === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution === "empty") return <div data-testid="page-empty">{empty}</div>;
    if (resolution === "error") return <div data-testid="page-error">Unable to load saved views</div>;
    return <div>{children}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) => (
    <div>
      <h2>{title}</h2>
      {action ? <button onClick={action.onClick}>{action.label}</button> : null}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({ Skeleton: () => <div data-testid="skeleton" /> }));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock("@/features/build/views/saved-views/view-card", () => ({
  ViewCard: ({ view }: { view: { name: string } }) => <div data-testid="view-card">{view.name}</div>,
}));

jest.mock("@/features/build/views/saved-views/create-view-sheet", () => ({
  CreateViewSheet: ({ open }: { open: boolean }) => (open ? <div role="dialog">Create saved view</div> : null),
}));

jest.mock("@/features/build/views/saved-views/rename-view-dialog", () => ({
  RenameViewDialog: () => null,
}));

describe("ProjectSettingsViewsPage", () => {
  beforeEach(() => {
    mockCanManage = true;
    mockQuery = { data: [], isLoading: false, isError: false };
  });

  it("renders the loading state while saved views are loading", () => {
    mockQuery = { data: undefined, isLoading: true, isError: false };

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton")).toHaveLength(2);
  });

  it("renders an actionable empty state for managers", async () => {
    const user = userEvent.setup();

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByRole("heading", { name: "Saved Views" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No saved views yet" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Create view" })[0]);
    expect(screen.getByRole("dialog")).toHaveTextContent("Create saved view");
  });

  it("does not expose create controls to viewers without manage permission", () => {
    mockCanManage = false;

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByRole("heading", { name: "No saved views yet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create view" })).not.toBeInTheDocument();
  });

  it("renders returned saved views", () => {
    mockQuery = {
      data: [{ id: 1, name: "Engineering board", layoutType: "board", isPinned: true }],
      isLoading: false,
      isError: false,
    };

    render(<ProjectSettingsViewsPage projectId={6} />);

    expect(screen.getByTestId("view-card")).toHaveTextContent("Engineering board");
  });
});
