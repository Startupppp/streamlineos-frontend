import { render, screen } from "@testing-library/react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { ProjectMemberRolesSection } from "./project-member-roles-section";

let mockPageState: PageStateResolution = { kind: "ready" };
let mockCanManage = false;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => mockCanManage,
  useCanState: () => "granted" as const,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => mockPageState,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    children,
    loading,
  }: {
    resolution: { kind: string };
    children: React.ReactNode;
    loading?: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div data-testid="page-loading">{loading}</div>;
    if (resolution.kind === "denied") return <div data-testid="page-denied" />;
    if (resolution.kind === "error") return <div data-testid="page-error" />;
    return <>{children}</>;
  },
}));

jest.mock("@/components/ui/table-pagination", () => ({
  useCursorPager: () => ({
    cursor: undefined,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
  }),
  TablePagination: () => null,
}));

const MOCK_MEMBERS = [
  { id: "user-1", name: "Alice", email: "alice@example.com", image: null, role: "MEMBER" },
  { id: "user-2", name: "Bob", email: "bob@example.com", image: null, role: "VIEWER" },
];

jest.mock("@/hooks/api/build", () => ({
  useProjectMembers: () => ({
    data: { data: MOCK_MEMBERS, pagination: { hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateProjectMemberRole: () => ({ mutate: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  mockPageState = { kind: "ready" };
  mockCanManage = false;
});

describe("ProjectMemberRolesSection — page state transitions", () => {
  it("renders the loading skeleton and not member names while the page state is loading", () => {
    mockPageState = { kind: "loading" };
    render(<ProjectMemberRolesSection projectId={1} />);
    expect(screen.getByTestId("page-loading")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("renders the denied view and not member names when access is refused", () => {
    mockPageState = { kind: "denied", permission: "build:view" };
    render(<ProjectMemberRolesSection projectId={1} />);
    expect(screen.getByTestId("page-denied")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("renders the error view and not member names when the data fetch fails", () => {
    mockPageState = { kind: "error", error: new Error("network failure") };
    render(<ProjectMemberRolesSection projectId={1} />);
    expect(screen.getByTestId("page-error")).toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("renders member names in the ready state", () => {
    render(<ProjectMemberRolesSection projectId={1} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});

describe("ProjectMemberRolesSection — build:manage gates", () => {
  it("shows a role selector for each member when the viewer holds build:manage", () => {
    mockCanManage = true;
    render(<ProjectMemberRolesSection projectId={1} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("shows a read-only role badge for each member when the viewer lacks build:manage", () => {
    render(<ProjectMemberRolesSection projectId={1} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("MEMBER")).toBeInTheDocument();
    expect(screen.getByText("VIEWER")).toBeInTheDocument();
  });

  it("hides role selectors while the access snapshot is in flight so a mutation control cannot appear then vanish", () => {
    mockCanManage = false;
    render(<ProjectMemberRolesSection projectId={1} />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

