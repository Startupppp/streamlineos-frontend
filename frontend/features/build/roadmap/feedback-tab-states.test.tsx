import { render, screen } from "@testing-library/react";
import { FeedbackTab } from "./feedback-tab";
import {
  useFeedbackPosts,
  useRoadmapItems,
  useDeleteFeedbackPost,
} from "@/hooks/api/build/roadmap";
import { usePageState } from "@/hooks/api/use-page-state";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useFeedbackPosts: jest.fn(),
  useRoadmapItems: jest.fn(() => ({ data: undefined })),
  useDeleteFeedbackPost: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useMergeFeedbackPost: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateFeedbackPost: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
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
    filtersActive,
  }: {
    title: string;
    description?: string;
    filtersActive?: boolean;
    illustration?: React.ReactNode;
    className?: string;
  }) => (
    <div
      data-testid="empty-state-content"
      data-title={title}
      data-filters-active={filtersActive ? "true" : "false"}
    />
  ),
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
  EmptyMailIllustration: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_FILL_PANEL: "",
  PM_PANEL: "",
}));

jest.mock("./feedback-row", () => ({
  FeedbackRow: () => <div data-testid="feedback-row" />,
}));

jest.mock("./merge-feedback-dialog", () => ({
  MergeFeedbackDialog: () => null,
}));

const mockUseFeedbackPosts = useFeedbackPosts as jest.Mock;
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

const ONE_ROW_QUERY = {
  data: {
    data: [
      {
        id: 1,
        title: "Add dark mode",
        status: "open",
        votes: 0,
        description: null,
        category: null,
        submittedByName: null,
        submittedByEmail: null,
        linkedRoadmapItemId: null,
        duplicateOfId: null,
        mergedAt: null,
        orgId: "org-1",
        crmContactId: null,
        crmOrganizationId: null,
        createdBy: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        deletedAt: null,
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
  mockUseFeedbackPosts.mockReturnValue(BASE_QUERY);
  mockUsePageState.mockReturnValue({ kind: "ready" });
});

describe("FeedbackTab — denial-is-not-emptiness", () => {
  it("renders NoPermissionState when denied — positive control: no-permission node is present", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:roadmap:view",
    });
    render(<FeedbackTab search="" />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it("renders NoPermissionState when denied — negative: EmptyState is NOT present", () => {
    mockUsePageState.mockReturnValue({
      kind: "denied",
      permission: "build:roadmap:view",
    });
    render(<FeedbackTab search="" />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("renders ready content with row when there is data — positive control proves the component renders", () => {
    mockUseFeedbackPosts.mockReturnValue(ONE_ROW_QUERY);
    mockUsePageState.mockReturnValue({ kind: "ready" });
    render(<FeedbackTab search="" />);
    expect(screen.getByTestId("page-state-ready")).toBeInTheDocument();
    expect(screen.getByTestId("feedback-row")).toBeInTheDocument();
  });

  it("renders the skeleton when loading — positive control: loading wrapper present", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<FeedbackTab search="" />);
    expect(screen.getByTestId("page-state-loading")).toBeInTheDocument();
  });

  it("renders the skeleton when loading — negative: ready content absent", () => {
    mockUsePageState.mockReturnValue({ kind: "loading" });
    render(<FeedbackTab search="" />);
    expect(screen.queryByTestId("page-state-ready")).not.toBeInTheDocument();
  });

  it("passes build:roadmap:view as the permission to usePageState so 402 is classified as denied", () => {
    render(<FeedbackTab search="" />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:roadmap:view" }),
    );
  });

  it("shows first-run empty title when no search is active", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<FeedbackTab search="" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByTestId("empty-state-content")).toHaveAttribute(
      "data-title",
      "No feedback yet",
    );
  });

  it("shows filtered-empty title when search is active — positive control: empty-state present", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<FeedbackTab search="dark mode" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("shows filtered-empty title when search is active — title is not the first-run phrase", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<FeedbackTab search="dark mode" />);
    expect(screen.getByTestId("empty-state-content")).not.toHaveAttribute(
      "data-title",
      "No feedback yet",
    );
  });
});
