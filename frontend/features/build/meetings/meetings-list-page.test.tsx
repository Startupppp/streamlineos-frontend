import React from "react";
import { render, screen } from "@testing-library/react";
import { MeetingsListPage } from "./meetings-list-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/1/meetings",
}));

jest.mock("@/hooks/api/build/meetings", () => ({
  useMeetings: jest.fn(),
  useCreateMeeting: jest.fn(),
}));

jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: jest.fn(),
}));

jest.mock("@/hooks/api/build/cycles", () => ({
  useCycles: jest.fn(),
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useProjectBoardTickets: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table" data-rows={data.length} />
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => <div data-testid="no-permission" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => null,
}));

jest.mock("@/components/ui/combobox", () => ({
  Combobox: () => null,
}));

jest.mock("./meeting-form-sheet", () => ({ MeetingFormSheet: () => null }));
jest.mock("./new-meeting-button", () => ({
  NewMeetingButton: ({ onBlank }: { onBlank: () => void }) => (
    <button onClick={onBlank}>Schedule Meeting</button>
  ),
  MEETING_TEMPLATES: [
    { id: "standup", label: "Standup" },
    { id: "planning", label: "Planning" },
  ],
}));
jest.mock("./next-meeting-strip", () => ({ NextMeetingStrip: () => null }));
jest.mock("./meetings-columns", () => ({
  MEETINGS_TABLE_HEADERS: ["Title", "Type", "Status", "Date"],
  buildMeetingsColumns: jest.fn(() => []),
  MeetingMobileCard: () => null,
}));
jest.mock("./generate-agenda", () => ({
  generateAgenda: jest.fn(() => ""),
}));

import { useMeetings, useCreateMeeting } from "@/hooks/api/build/meetings";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectBoardTickets } from "@/hooks/api/build/tickets";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseMeetings = useMeetings as jest.Mock;
const mockUseCreateMeeting = useCreateMeeting as jest.Mock;
const mockUseProjectMembers = useProjectMembers as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:meetings:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    ...overrides,
  };
}

function meetingPages(rows: unknown[]) {
  return { pages: [{ data: rows }] };
}

function defaultFilters(overrides: Record<string, unknown> = {}) {
  return {
    value: jest.fn(() => "all"),
    isActive: jest.fn(() => false),
    setValue: jest.fn(),
    clearAll: jest.fn(),
    isFiltered: false,
    resetKey: "0",
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    ...overrides,
  };
}

const meetingRow = {
  id: 1,
  projectId: 1,
  title: "Weekly Standup",
  type: "standup",
  status: "scheduled",
  scheduledAt: "2026-09-28T09:00:00Z",
  createdAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseMeetings.mockReturnValue(baseQueryResult({ data: meetingPages([]) }));
  mockUseCreateMeeting.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseProjectMembers.mockReturnValue({ data: [] });
  mockUseCycles.mockReturnValue({ data: [] });
  mockUseProjectBoardTickets.mockReturnValue({ data: undefined });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
});

it("shows loading skeleton while access is loading and not error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseMeetings.mockReturnValue(baseQueryResult());
  render(<MeetingsListPage projectId={1} />);
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows NoPermissionState when build:meetings:view is denied and not the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseMeetings.mockReturnValue(baseQueryResult());
  render(<MeetingsListPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and not the skeleton", () => {
  mockUseMeetings.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network error") }),
  );
  render(<MeetingsListPage projectId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path from the backend rather than a generic error state (FE-41)", () => {
  mockUseMeetings.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<MeetingsListPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when rows are present and not the empty state", () => {
  mockUseMeetings.mockReturnValue(
    baseQueryResult({ data: meetingPages([meetingRow]) }),
  );
  render(<MeetingsListPage projectId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows 'No meetings yet' empty state when there are no rows and no active filter", () => {
  render(<MeetingsListPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No meetings yet");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows 'No meetings found' when filters are active and no rows match", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  render(<MeetingsListPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No meetings found");
  expect(screen.queryByText("No meetings yet")).not.toBeInTheDocument();
});
