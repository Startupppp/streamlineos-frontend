import { render, screen } from "@testing-library/react";
import { ChangelogTab } from "./changelog-tab";
import {
  useChangelog,
  useUpdateChangelogEntry,
  useDeleteChangelogEntry,
} from "@/hooks/api/build/roadmap";
import { usePageState } from "@/hooks/api/use-page-state";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useChangelog: jest.fn(),
  useUpdateChangelogEntry: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteChangelogEntry: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading")
      return <div data-testid="page-state-loading">{loading}</div>;
    if (resolution.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission ?? ""}
        />
      );
    if (resolution.kind === "error")
      return <div data-testid="error-state" />;
    if (resolution.kind === "empty")
      return <div data-testid="empty-state">{empty}</div>;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({
    title,
  }: {
    title: string;
    action?: unknown;
    illustration?: React.ReactNode;
    className?: string;
  }) => <div data-testid="empty-state-content" data-title={title} />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state-content" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyTicketIllustration: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_FILL_PANEL: "",
  PM_PANEL: "",
}));

jest.mock("./changelog-entry-card", () => ({
  ChangelogEntryCard: () => <div data-testid="changelog-entry-card" />,
}));

jest.mock("./changelog-sheet", () => ({
  ChangelogSheet: () => null,
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUseChangelog = useChangelog as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;

const BASE_QUERY = {
  data: {
    data: [],
    pagination: { hasMore: false, nextCursor: null, limit: 20 },
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

const ONE_ENTRY_QUERY = {
  data: {
    data: [
      {
        id: 1,
        orgId: "org-1",
        title: "v1.0 released",
        content: "shipped",
        type: "feature",
        version: null,
        isPublished: false,
        linkedRoadmapItemId: null,
        publishedAt: null,
        createdBy: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ],
    pagination: { hasMore: false, nextCursor: null, limit: 20 },
  },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseChangelog.mockReturnValue(BASE_QUERY);
  mockUsePageState.mockReturnValue({ kind: "ready" });
});

describe("ChangelogTab — denial-is-not-emptiness", () => {
  it("renders NoPermissionState when denied — positive control: no-permission node is present", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:roadmap:view",
    });
    render(<ChangelogTab />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("renders NoPermissionState when denied — negative: EmptyState is NOT present", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:roadmap:view",
    });
    render(<ChangelogTab />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("renders entry cards when there is data — positive control proves component renders", () => {
    mockUseChangelog.mockReturnValue(ONE_ENTRY_QUERY);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<ChangelogTab />);
    expect(screen.getByTestId("page-state-ready")).toBeInTheDocument();
    expect(screen.getByTestId("changelog-entry-card")).toBeInTheDocument();
  });

  it("renders the skeleton when loading — positive control: loading wrapper present", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<ChangelogTab />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
  });

  it("renders the skeleton when loading — negative: ready content absent", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<ChangelogTab />);
    expect(screen.queryByTestId("page-state-ready")).not.toBeInTheDocument();
  });

  it("passes build:roadmap:view as the permission to usePageState so 402 is classified as denied", () => {
    render(<ChangelogTab />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:roadmap:view" }),
    );
  });
});
