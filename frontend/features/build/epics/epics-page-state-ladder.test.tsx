import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import {
  ACCESS_DENIED,
  ACCESS_LOADING,
  EPIC_ROW,
  disabledQueryResult,
  epicPageResult,
  filtersReturning,
  installEpicsPageMocks,
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
  params,
  readCapturedToolbarFilters,
  readyPage,
} from "./epics-page-test-harness";
import { EpicsPage } from "./epics-page";
import { ApiError } from "@/lib/api-envelope";

beforeEach(installEpicsPageMocks);

it("shows skeleton not empty state while access snapshot is still in flight because queries are disabled until snapshot lands", async () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseCan.mockReturnValue(false);
  mockUseProject.mockReturnValue(disabledQueryResult());
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

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
  mockUseProjectBoardTickets.mockReturnValue(disabledQueryResult());

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the error state with the backend message on data fetch failure, not a generic fallback", async () => {
  mockUseProjectBoardTickets.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("Failed to load tickets"),
    refetch: jest.fn(),
  });

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const errorEl = screen.getByTestId("error-state");
  expect(errorEl.textContent).toContain("Failed to load tickets");
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("renders the empty state when there are no epics, distinguishing setup from filtered no-result", async () => {
  mockUseProjectBoardTickets.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });

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
  };
  mockUseProjectBoardTickets.mockReturnValue({
    data: [epicTicket],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseEpicPage.mockReturnValue(epicPageResult([epicTicket]));

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
  };
  mockUseProjectBoardTickets.mockReturnValue({
    data: [epicTicket],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  mockUseEpicPage.mockReturnValue(epicPageResult([epicTicket]));

  await act(async () => {
    render(<EpicsPage params={params} />);
  });

  const calls = mockUseBuildListKeyboard.mock.calls;
  const lastArgs = calls[calls.length - 1]?.[0];
  expect(lastArgs?.enabled).toBe(true);
  expect(lastArgs?.itemCount).toBe(1);
});
