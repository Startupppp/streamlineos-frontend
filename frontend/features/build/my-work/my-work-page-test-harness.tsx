import type { ReactNode } from "react";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";

export const mockReplace = jest.fn();
export const mockPush = jest.fn();
export const mockUseAccess = jest.fn();
export const mockUseAllWork = jest.fn();

export const mockSearchParamsContainer = { current: new URLSearchParams() };

export const accessLoading = { data: undefined, isLoading: true };
export const accessGranted = {
  data: {
    isOrgOwner: false,
    scopes: {
      "build:tickets:view": "all",
      "build:tickets:update": "all",
      "build:tickets:assign": "all",
    },
    modules: { build: true },
  },
  isLoading: false,
};
export const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: { build: true } },
  isLoading: false,
};

export const mockDefaultDisplayOptions = {
  showId: true,
  showStatus: true,
  showPriority: true,
  showEstimate: false,
  showAssignee: true,
  showLabels: false,
  showCycle: false,
  showDueDate: false,
};

export function mockMakeCursorPaginationStub() {
  return {
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  };
}

export function MockMyWorkContentStub({
  pageState,
  filtersActive,
  emptyTitle,
  bulk,
  onClearFilters,
}: {
  pageState: PageStateResolution;
  filtersActive: boolean;
  emptyTitle: string;
  bulk: { selectedCount: number };
  onClearFilters: () => void;
}) {
  const { useOnlineStatus } = jest.requireMock<{
    useOnlineStatus: () => boolean;
  }>("@/hooks/common/use-online-status");
  const isOnline = useOnlineStatus();

  if (pageState.kind === "loading") {
    return <div data-testid="loading-skeleton" />;
  }
  if (
    pageState.kind === "denied" ||
    pageState.kind === "module-disabled" ||
    pageState.kind === "module-denied" ||
    pageState.kind === "plan-required"
  ) {
    return <div data-testid="denied-view">Access Restricted</div>;
  }
  if (pageState.kind === "empty") {
    if (!isOnline) {
      return (
        <div data-testid="offline-notice">
          You&apos;re offline — results may not be up to date
        </div>
      );
    }
    return (
      <div data-testid="empty-state">
        {filtersActive ? (
          <button type="button" onClick={onClearFilters}>
            Clear filters
          </button>
        ) : (
          <span>{emptyTitle}</span>
        )}
      </div>
    );
  }
  if (pageState.kind === "error") {
    return <div data-testid="error-state">Error loading</div>;
  }
  return (
    <div data-testid="content-ready">
      {bulk.selectedCount > 0 ? (
        <div data-testid="bulk-bar">{bulk.selectedCount} selected</div>
      ) : null}
    </div>
  );
}

export function mockPageWrapperStub({
  children,
  filters,
}: {
  children?: ReactNode;
  filters?: ReactNode;
}) {
  return (
    <div data-testid="page-wrapper">
      {filters}
      {children}
    </div>
  );
}

export function mockPageTabsToolbarStub({
  tabs,
  filters,
  actions,
}: {
  tabs?: ReactNode;
  filters?: (() => ReactNode) | ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div data-testid="tabs-toolbar">
      {tabs}
      {typeof filters === "function" ? filters() : filters}
      {actions}
    </div>
  );
}

export function mockPageStateStub({
  resolution,
  children,
  loading,
}: {
  resolution: PageStateResolution;
  children: ReactNode;
  loading: ReactNode;
}) {
  if (
    resolution.kind === "denied" ||
    resolution.kind === "module-disabled" ||
    resolution.kind === "plan-required"
  )
    return <div data-testid="denied-view">Access Restricted</div>;
  if (resolution.kind === "loading") return <>{loading}</>;
  if (resolution.kind === "ready" || resolution.kind === "empty")
    return <>{children}</>;
  return null;
}

export const stubTicket = {
  id: 1,
  title: "Test ticket",
  type: "TASK",
  status: "TODO",
  priority: "MEDIUM",
  projectId: 42,
  projectKey: "ENG",
  projectName: "Engineering",
  ticketNumber: 1,
  sprintId: null,
  epicId: null,
  assigneeId: null,
  points: null,
  estimate: null,
  rank: null,
  startDate: null,
  dueDate: null,
  cycleId: null,
  createdAt: null,
  updatedAt: null,
  assignee: null,
  labels: [],
};

export function defaultAllWork() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

export function withData(tickets = [stubTicket], hasMore = false) {
  return {
    data: {
      data: tickets,
      hasMore,
      nextCursor: hasMore ? "cur1" : null,
      limit: 50,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}
