import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  ACCESS_DENIED,
  ACCESS_LOADING,
  disabledQueryResult,
  makeMutationResult,
  mockUseAccess,
  mockUseBuildListFilters,
  mockUseBuildListKeyboard,
  mockUseCan,
  mockUseEpicPage,
  mockUseOnlineStatus,
  mockUseProject,
  mockUseProjectBoardTickets,
  mockUseUpdateTicket,
  readCapturedToolbarFilters,
} from "./epics-page-test-harness";
import {
  EPIC_ROW,
  epicPageResult,
  filtersReturning,
  installEpicsPageMocks,
  params,
  readyPage,
} from "./epics-test-fixtures";
import { EpicsPage } from "./epics-page";
import { ApiError } from "@/lib/api-envelope";
import type { useProjectBoardTickets } from "@/hooks/api/build/ticket-queries";

type BoardResult = ReturnType<typeof useProjectBoardTickets>;

function pendingBoardResult(): BoardResult {
  return {
    data: [],
    total: 0,
    loadedCount: 0,
    isTruncated: false,
    error: null,
    isError: false,
    isPending: true,
    isLoading: true,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: false,
    status: "pending",
    fetchStatus: "idle",
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isFetched: false,
    isFetchedAfterMount: false,
    isFetching: false,
    isInitialLoading: true,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: true,
    isEnabled: false,
    fetchNextPage: jest.fn(),
    fetchPreviousPage: jest.fn(),
    hasNextPage: false,
    hasPreviousPage: false,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    isFetchPreviousPageError: false,
    isFetchingPreviousPage: false,
    refetch: jest.fn(),
    promise: new Promise<Awaited<BoardResult["promise"]>>(() => undefined),
  };
}

function errorBoardResult(error: Error): BoardResult {
  return {
    data: [],
    total: 0,
    loadedCount: 0,
    isTruncated: false,
    error,
    isError: true,
    isPending: false,
    isLoading: false,
    isLoadingError: true,
    isRefetchError: false,
    isSuccess: false,
    status: "error",
    fetchStatus: "idle",
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 1,
    failureReason: error,
    errorUpdateCount: 1,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isPaused: false,
    isPlaceholderData: false,
    isRefetching: false,
    isStale: true,
    isEnabled: true,
    fetchNextPage: jest.fn(),
    fetchPreviousPage: jest.fn(),
    hasNextPage: false,
    hasPreviousPage: false,
    isFetchNextPageError: false,
    isFetchingNextPage: false,
    isFetchPreviousPageError: false,
    isFetchingPreviousPage: false,
    refetch: jest.fn(),
    promise: new Promise<Awaited<BoardResult["promise"]>>(() => undefined),
  };
}

beforeEach(installEpicsPageMocks);

it("shows skeleton not empty state while access snapshot is still in flight because queries are disabled until snapshot lands", async () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(pendingBoardResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("shows NoPermissionState not empty state when build:view is denied", async () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(pendingBoardResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the error state with the backend message on data fetch failure, not a generic fallback", async () => {
  mockUseProjectBoardTickets.mockReturnValue(errorBoardResult(new Error("Failed to load tickets")));

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Failed to load tickets");
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the empty state when there are no epics, distinguishing setup from filtered no-result", async () => {
  readyPage([]);

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  expect(screen.queryByTestId("epic-card")).not.toBeInTheDocument();
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
});

it("renders epic cards when epics are present and user has view access", async () => {
  const epicTicket = {
    id: 1, orgId: "org-1", projectId: 1, title: "Epic A", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 1, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1000", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-1", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
    version: 1,
  };
  readyPage([epicTicket]);

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("epic-card")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("enables keyboard navigation bound to the epic count when epics are present and access is granted", async () => {
  const epicTicket = {
    id: 2, orgId: "org-1", projectId: 1, title: "Epic B", type: "EPIC",
    status: "TODO", priority: "MEDIUM", ticketNumber: 2, epicId: null,
    reporterId: "user-1", points: null, storyPoints: null, link: null,
    rank: "1001", parentTicketId: null, originalEstimate: null, timeSpent: null,
    startDate: null, dueDate: null, moduleId: null, cycleId: null,
    sequenceId: "PROJ-2", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01",
    version: 1,
  };
  readyPage([epicTicket]);

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.enabled).toBe(true);
  expect(lastArgs?.itemCount).toBe(1);
});
