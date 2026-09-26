import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TriagePage } from "./triage-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api", () => ({
  useProject: jest.fn(),
  useTickets: jest.fn(),
  useUpdateTicket: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/1/triage",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: () => ({
    search: "",
    debouncedSearch: "",
    cursor: null,
    setSearch: jest.fn(),
    setCursor: jest.fn(),
    clearAll: jest.fn(),
    resetKey: "",
    value: jest.fn(() => ""),
    setValue: jest.fn(),
    activeCount: 0,
    isFiltered: false,
  }),
}));

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: () => <div data-testid="table-pagination" />,
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-item" className={className} />
  ),
}));

jest.mock("./triage-row", () => ({
  TriageRow: ({ isSelected }: { isSelected?: boolean }) => (
    <div data-testid="triage-row" data-selected={String(isSelected)} />
  ),
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(() => ({ focusedIndex: null, setFocusedIndex: jest.fn() })),
}));

jest.mock("@/hooks/api/build", () => ({
  useBulkUpdateTickets: jest.fn(),
  useProjectMembers: jest.fn(() => ({ data: [] })),
  useCycles: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: ({
    onBulkStatus,
    onBulkPriority,
    onBulkAssignee,
    onBulkCycle,
  }: {
    onBulkStatus?: (v: string) => void;
    onBulkPriority?: (v: string) => void;
    onBulkAssignee?: (v: string) => void;
    onBulkCycle?: (v: string) => void;
  }) => (
    <div data-testid="bulk-action-bar">
      <button type="button" data-testid="bulk-status-btn" onClick={() => onBulkStatus?.("IN_PROGRESS")}>Status</button>
      <button type="button" data-testid="bulk-priority-btn" onClick={() => onBulkPriority?.("HIGH")}>Priority</button>
      <button type="button" data-testid="bulk-assignee-btn" onClick={() => onBulkAssignee?.("user-1")}>Assignee</button>
      <button type="button" data-testid="bulk-cycle-btn" onClick={() => onBulkCycle?.("2")}>Cycle</button>
    </div>
  ),
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: jest.fn(() => "/build/1/tickets/1"),
}));

import { useProject, useTickets, useUpdateTicket } from "@/hooks/api";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBulkUpdateTickets } from "@/hooks/api/build";

const mockUseProject = useProject as jest.Mock;
const mockUseTickets = useTickets as jest.Mock;
const mockUseUpdateTicket = useUpdateTicket as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListKeyboard = useBuildListKeyboard as jest.Mock;
const mockUseBulkUpdateTickets = useBulkUpdateTickets as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseTicketsResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue({ data: { key: "PROJ" } });
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [], pagination: { hasMore: false } } }),
  );
  mockUseUpdateTicket.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

it("shows a skeleton while the access snapshot is in flight, not an empty or denied state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseTickets.mockReturnValue(baseTicketsResult());
  render(<TriagePage projectId={1} />);
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/nothing to triage/i)).not.toBeInTheDocument();
});

it("shows the plan denial view with upgrade link when tickets query returns 402 MODULE_NOT_ENABLED, not a generic error", () => {
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseTickets.mockReturnValue(
    baseTicketsResult({
      isError: true,
      error: new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
        moduleKey: "build",
        reason: "not-in-plan",
        upgradePath: "/settings/billing",
      }),
    }),
  );
  render(<TriagePage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("shows the denial view, not an empty submissions list, when the user lacks build:tickets:view", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseTickets.mockReturnValue(baseTicketsResult());
  render(<TriagePage projectId={1} />);
  expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByText(/nothing to triage/i)).not.toBeInTheDocument();
});

it("renders the error state with the backend message on query failure, preserving the request context", () => {
  mockUseTickets.mockReturnValue(
    baseTicketsResult({
      isError: true,
      error: new Error("Could not connect to build service"),
    }),
  );
  render(<TriagePage projectId={1} />);
  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Could not connect to build service");
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders an empty state when there are no submissions, so triage-empty is distinguishable from a denied state", () => {
  mockUseTickets.mockReturnValue(
    baseTicketsResult({
      data: { data: [], pagination: { hasMore: false } },
    }),
  );
  render(<TriagePage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("renders triage rows when submissions are present, confirming the ready state renders content", () => {
  const submission = {
    id: 99, orgId: "org-1", projectId: 1, title: "Bug: button broken",
    type: "BUG", status: "TRIAGE", priority: "HIGH", ticketNumber: 99,
    epicId: null, reporterId: "user-1", points: null, storyPoints: null,
    link: null, rank: "1000", parentTicketId: null, originalEstimate: null,
    timeSpent: null, startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-99", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };
  mockUseTickets.mockReturnValue(
    baseTicketsResult({
      data: { data: [submission], pagination: { hasMore: false } },
    }),
  );
  render(<TriagePage projectId={1} />);
  expect(screen.getByTestId("triage-row")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("wires useBuildListKeyboard enabled only when triage is in the ready state, not during loading or denial", () => {
  const submission = {
    id: 99, orgId: "org-1", projectId: 1, title: "Bug: button broken",
    type: "BUG", status: "TRIAGE", priority: "HIGH", ticketNumber: 99,
    epicId: null, reporterId: "user-1", points: null, storyPoints: null,
    link: null, rank: "1000", parentTicketId: null, originalEstimate: null,
    timeSpent: null, startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-99", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [submission], pagination: { hasMore: false } } }),
  );
  render(<TriagePage projectId={1} />);
  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.enabled).toBe(true);
  expect(typeof lastArgs?.onOpen).toBe("function");
  expect(lastArgs?.itemCount).toBe(1);
});

it("renders a checkbox per row when the user has build:tickets:update permission", () => {
  const submission = {
    id: 99, orgId: "org-1", projectId: 1, title: "Bug: button broken",
    type: "BUG", status: "TRIAGE", priority: "HIGH", ticketNumber: 99,
    epicId: null, reporterId: "user-1", points: null, storyPoints: null,
    link: null, rank: "1000", parentTicketId: null, originalEstimate: null,
    timeSpent: null, startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-99", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
  };
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [submission], pagination: { hasMore: false } } }),
  );
  const { container } = render(<TriagePage projectId={1} />);
  const checkbox = container.querySelector('button[role="checkbox"], input[type="checkbox"]');
  expect(checkbox).toBeInTheDocument();
});

const SUBMISSION = {
  id: 99, orgId: "org-1", projectId: 1, title: "Bug: button broken",
  type: "BUG", status: "TRIAGE", priority: "HIGH", ticketNumber: 99,
  epicId: null, reporterId: "user-1", points: null, storyPoints: null,
  link: null, rank: "1000", parentTicketId: null, originalEstimate: null,
  timeSpent: null, startDate: null, dueDate: null, moduleId: null, cycleId: null,
  sequenceId: "PROJ-99", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
};

it("selecting a row then clicking bulk-status invokes useBulkUpdateTickets mutate with status and the selected ticket id", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [SUBMISSION], pagination: { hasMore: false } } }),
  );
  const { container } = render(<TriagePage projectId={1} />);
  const checkbox = container.querySelector('button[role="checkbox"], input[type="checkbox"]');
  expect(checkbox).toBeInTheDocument();
  await act(async () => { fireEvent.click(checkbox!); });
  expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-status-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [99], status: "IN_PROGRESS" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});

it("selecting a row then clicking bulk-priority invokes useBulkUpdateTickets mutate with priority and the selected ticket id", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [SUBMISSION], pagination: { hasMore: false } } }),
  );
  const { container } = render(<TriagePage projectId={1} />);
  const checkbox = container.querySelector('button[role="checkbox"], input[type="checkbox"]');
  await act(async () => { fireEvent.click(checkbox!); });
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-priority-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [99], priority: "HIGH" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});

it("selecting a row then clicking bulk-assignee invokes useBulkUpdateTickets mutate with assigneeId and the selected ticket id", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [SUBMISSION], pagination: { hasMore: false } } }),
  );
  const { container } = render(<TriagePage projectId={1} />);
  const checkbox = container.querySelector('button[role="checkbox"], input[type="checkbox"]');
  await act(async () => { fireEvent.click(checkbox!); });
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-assignee-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [99], assigneeId: "user-1" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});

it("selecting a row then clicking bulk-cycle invokes useBulkUpdateTickets mutate with cycleId and the selected ticket id", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ mutate: bulkMutate, isPending: false });
  mockUseTickets.mockReturnValue(
    baseTicketsResult({ data: { data: [SUBMISSION], pagination: { hasMore: false } } }),
  );
  const { container } = render(<TriagePage projectId={1} />);
  const checkbox = container.querySelector('button[role="checkbox"], input[type="checkbox"]');
  await act(async () => { fireEvent.click(checkbox!); });
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-cycle-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [99], cycleId: 2 },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});
