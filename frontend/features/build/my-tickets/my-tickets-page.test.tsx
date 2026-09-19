import React, { Suspense, act } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MyTicketsPage } from "./my-tickets-page";

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "user-1" } }, status: "authenticated" }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useSearchParams: () => mockSearchParams,
  notFound: jest.fn(() => null),
}));

const MOCK_PROJECT = {
  id: 1,
  key: "PROJ",
  name: "Test Project",
  statuses: [
    { name: "TODO", color: null, type: null },
    { name: "DONE", color: null, type: null },
  ],
};

const DONE_TICKET_FOR_USER_1 = {
  id: 1,
  title: "Existing ticket",
  status: "DONE",
  type: "TASK",
  priority: null,
  assigneeId: "user-1",
  assignees: [],
  reporterId: null,
  ticketNumber: 1,
  rank: null,
  points: null,
  timeSpent: null,
  epicId: null,
  sprintId: null,
  cycleId: null,
  moduleId: null,
  dueDate: null,
  startDate: null,
  createdAt: null,
  updatedAt: null,
  sequenceId: null,
  assignee: null,
  labels: [],
  cycle: null,
  descriptionExcerpt: null,
};

jest.mock("@/hooks/api", () => ({
  useProject: () => ({
    data: MOCK_PROJECT,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/hooks/api/build", () => ({
  useProjectBoardTickets: () => ({
    data: [DONE_TICKET_FOR_USER_1],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: () => null,
}));

jest.mock("@/features/build/ticket-details/build-ticket-detail-url", () => ({
  buildTicketDetailUrl: () => null,
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => null,
}));

jest.mock("./my-tickets-view-body", () => ({
  MyTicketsViewBody: () => <div data-testid="view-body" />,
}));

jest.mock("./my-tickets-skeleton", () => ({
  MyTicketsSkeleton: () => null,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
  }: {
    children: React.ReactNode;
    filters?: React.ReactNode;
  }) => (
    <div>
      {filters}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({
    filtersActive,
    onClearFilters,
  }: {
    filtersActive?: boolean;
    onClearFilters?: () => void;
  }) => (
    <div data-testid="empty-state" data-filters-active={String(filtersActive)}>
      {onClearFilters && (
        <button
          data-testid="clear-filters-btn"
          type="button"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      )}
    </div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => null,
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  PAGE_CHROME_X: "",
}));

async function renderPage(query: string) {
  mockSearchParams = new URLSearchParams(query);
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <MyTicketsPage params={Promise.resolve({ projectId: "1" })} />
      </Suspense>,
    );
  });
}

function lastReplaceUrl(): URLSearchParams {
  const raw = String(mockReplace.mock.calls.at(-1)?.[0] ?? "");
  const qs = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  return new URLSearchParams(qs);
}

beforeEach(() => {
  mockReplace.mockReset();
});

describe("MyTicketsPage — handleClearFilters covers all filter bar params", () => {
  it("removes labels, cycle, projectIds, dueDateFrom and dueDateTo that the filter bar owns but the previous implementation left in the URL after clearing status", async () => {
    await renderPage(
      "status=TODO&labels=1&cycle=2&projectIds=3&dueDateFrom=2026-01-01&dueDateTo=2026-01-31",
    );

    const btn = screen.getByTestId("clear-filters-btn");
    fireEvent.click(btn);

    const params = lastReplaceUrl();
    expect(params.has("status")).toBe(false);
    expect(params.has("labels")).toBe(false);
    expect(params.has("cycle")).toBe(false);
    expect(params.has("projectIds")).toBe(false);
    expect(params.has("dueDateFrom")).toBe(false);
    expect(params.has("dueDateTo")).toBe(false);
  });

  it("removes assigneeId and sprintId too, matching what the filter bar clearAll already clears", async () => {
    await renderPage("status=TODO&assigneeId=user-2&sprintId=5");

    const btn = screen.getByTestId("clear-filters-btn");
    fireEvent.click(btn);

    const params = lastReplaceUrl();
    expect(params.has("status")).toBe(false);
    expect(params.has("assigneeId")).toBe(false);
    expect(params.has("sprintId")).toBe(false);
  });
});
