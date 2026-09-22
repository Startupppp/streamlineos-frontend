import { render, screen } from "@testing-library/react";
import { ProjectSubmissionsInbox } from "./project-submissions-inbox";

const mockUseSearchParams = jest.fn(() => new URLSearchParams());
const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
  useRouter: () => ({ replace: mockRouterReplace, push: mockRouterPush }),
  usePathname: () => "/build/1/feedbucket",
}));

const mockUseFeedbucketSubmissions = jest.fn();
const mockUseDeleteFeedbucketSubmission = jest.fn();

jest.mock("@/hooks/api/feedbucket", () => ({
  useFeedbucketSubmissions: (...args: unknown[]) => mockUseFeedbucketSubmissions(...args),
  useDeleteFeedbucketSubmission: () => mockUseDeleteFeedbucketSubmission(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(false),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 hours ago",
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/utils", () => ({
  resolveImageUrl: (url: string) => url,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({
    data,
    emptyState,
  }: {
    data: unknown[];
    emptyState?: React.ReactNode;
  }) => (
    <div data-testid="data-table" data-row-count={data.length}>
      {data.length === 0 && emptyState}
    </div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) => (
    <div data-testid="empty-state">
      <span data-testid="empty-title">{title}</span>
      {action && (
        <button data-testid="empty-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  ),
}));

jest.mock("@/components/shared", () => ({
  ErrorState: ({ description, onRetry }: { description: string; onRetry?: () => void }) => (
    <div data-testid="error-state">
      <span>{description}</span>
      {onRetry && <button data-testid="retry-button" onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyInboxIllustration: () => null,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    "aria-label": ariaLabel,
    ...rest
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    "aria-label"?: string;
  } & Record<string, unknown>) => (
    <input
      aria-label={ariaLabel}
      value={value}
      onChange={onChange}
      {...rest}
    />
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <div data-testid="select" data-value={value}>
      <button
        data-testid={`select-trigger-${value}`}
        onClick={() => onValueChange?.("open")}
      />
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    access: { allowed: true, denied: false, pending: false, permission: "feedbucket:submissions:view" },
    ...overrides,
  };
}

function makePagedResult(rows: unknown[] = [], total = 0) {
  return {
    data: rows,
    total,
    page: 1,
    limit: 25,
    totalPages: Math.ceil(total / 25),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  mockUseDeleteFeedbucketSubmission.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
  mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
});

describe("ProjectSubmissionsInbox — state ladder", () => {
  it("renders skeletons while loading and no data-table so the user sees motion, not an empty shell", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ isLoading: true, data: undefined }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });

  it("still renders the data-table when there are rows so the positive control shows content, not a skeleton", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseQueryResult({ data: makePagedResult([{ id: 1, type: "bug", status: "open", message: "Test", createdAt: "2026-01-01T00:00:00Z", screenshotUrl: null }], 1) }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.queryByTestId("skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("data-table")).toBeInTheDocument();
  });

  it("renders the error state when the query fails and not the empty state so a network denial is not silently presented as an empty inbox", () => {
    mockUseFeedbucketSubmissions.mockReturnValue(
      baseQueryResult({ isError: true, data: undefined }),
    );
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
  });
});

describe("ProjectSubmissionsInbox — first-run empty vs filtered-empty", () => {
  it("shows the first-run empty title when no filters are active and the inbox is empty", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No submissions yet");
  });

  it("shows the filtered-empty title when the status filter is active and the inbox is empty", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("status=open"));
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("shows the filtered-empty title when the type filter is active and the inbox is empty", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("type=bug"));
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("offers a clear-filters action in filtered-empty so the user can escape without navigating away", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("status=resolved"));
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("empty-action")).toHaveTextContent("Clear filters");
  });

  it("does NOT offer the clear-filters action for first-run empty because there is nothing to clear", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.queryByTestId("empty-action")).not.toBeInTheDocument();
  });
});

describe("ProjectSubmissionsInbox — URL-backed filters passed to API", () => {
  it("calls useFeedbucketSubmissions without status when no URL param is present", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProjectSubmissionsInbox widgetId={2} projectId={1} />);

    const call = mockUseFeedbucketSubmissions.mock.calls[0][0] as Record<string, unknown>;
    expect(call.widgetId).toBe(2);
    expect(call.status).toBeUndefined();
  });

  it("reads the status param from the URL and passes it to useFeedbucketSubmissions so the filter is server-side", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("status=in_progress"));
    render(<ProjectSubmissionsInbox widgetId={2} projectId={1} />);

    expect(mockUseFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 2, status: "in_progress" }),
    );
  });

  it("reads the type param from the URL and passes it to useFeedbucketSubmissions so the filter is server-side", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("type=feature"));
    render(<ProjectSubmissionsInbox widgetId={3} projectId={1} />);

    expect(mockUseFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 3, type: "feature" }),
    );
  });

  it("omits type from the API call when no type param is set so the API returns all types unfiltered", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("status=open"));
    render(<ProjectSubmissionsInbox widgetId={3} projectId={1} />);

    const call = mockUseFeedbucketSubmissions.mock.calls[0][0] as Record<string, unknown>;
    expect(call.type).toBeUndefined();
  });

  it("reads the linked=linked param from the URL and passes it to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("linked=linked"));
    render(<ProjectSubmissionsInbox widgetId={4} projectId={1} />);

    expect(mockUseFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ widgetId: 4, linked: "linked" }),
    );
  });

  it("reads the linked=unlinked param from the URL and passes it to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("linked=unlinked"));
    render(<ProjectSubmissionsInbox widgetId={4} projectId={1} />);

    expect(mockUseFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ linked: "unlinked" }),
    );
  });

  it("omits linked from the API call when no linked param is set so all link states are returned", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<ProjectSubmissionsInbox widgetId={4} projectId={1} />);

    const call = mockUseFeedbucketSubmissions.mock.calls[0][0] as Record<string, unknown>;
    expect(call.linked).toBeUndefined();
  });

  it("reads the from param from the URL and passes it to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("from=2026-01-01T00%3A00%3A00Z"));
    render(<ProjectSubmissionsInbox widgetId={5} projectId={1} />);

    expect(mockUseFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ from: "2026-01-01T00:00:00Z" }),
    );
  });

  it("reads the to param from the URL and passes it to useFeedbucketSubmissions", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("to=2026-06-01T00%3A00%3A00Z"));
    render(<ProjectSubmissionsInbox widgetId={5} projectId={1} />);

    expect(mockUseFeedbucketSubmissions).toHaveBeenCalledWith(
      expect.objectContaining({ to: "2026-06-01T00:00:00Z" }),
    );
  });

  it("omits from and to from the API call when those params are not in the URL", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("status=open"));
    render(<ProjectSubmissionsInbox widgetId={5} projectId={1} />);

    const call = mockUseFeedbucketSubmissions.mock.calls[0][0] as Record<string, unknown>;
    expect(call.from).toBeUndefined();
    expect(call.to).toBeUndefined();
  });
});

describe("ProjectSubmissionsInbox — new filter params count as active filters", () => {
  it("shows filtered-empty title when linked param is set and inbox is empty", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("linked=linked"));
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("shows filtered-empty title when from param is set and inbox is empty", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("from=2026-01-01T00%3A00%3A00Z"));
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });

  it("shows filtered-empty title when to param is set and inbox is empty", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("to=2026-06-01T00%3A00%3A00Z"));
    mockUseFeedbucketSubmissions.mockReturnValue(baseQueryResult({ data: makePagedResult() }));
    render(<ProjectSubmissionsInbox widgetId={1} projectId={1} />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No matching submissions");
  });
});
