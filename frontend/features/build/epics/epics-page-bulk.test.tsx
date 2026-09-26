import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { EpicsPage } from "./epics-page";

jest.mock("@/hooks/api/build", () => ({
  useProject: jest.fn(),
  useProjectBoardTickets: jest.fn(),
  useUpdateTicket: jest.fn(),
  useDeleteTicket: jest.fn(),
  useCreateTicket: jest.fn(),
  useBulkUpdateTickets: jest.fn(),
  useCycles: jest.fn(),
  useProjectMembers: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({ useEntitlements: () => ({ data: undefined }) }));
jest.mock("@/features/build/shared/module-disabled-state", () => ({ ModuleDisabledState: () => <div data-testid="module-disabled" /> }));
jest.mock("@/features/build/shared/completed-status", () => ({ getCompletedStatusNames: () => new Set<string>() }));
jest.mock("@/features/build/epics/create-epic-dialog", () => ({ CreateEpicDialog: () => <div /> }));
jest.mock("@/features/build/epics/epic-story-row", () => ({ EpicStoryRow: () => <div data-testid="epic-story-row" /> }));
jest.mock("@/components/shared/no-permission-state", () => ({ NoPermissionState: () => <div data-testid="no-permission" /> }));
jest.mock("@/components/shared/error-state", () => ({ ErrorState: () => <div data-testid="error-state" /> }));
jest.mock("@/components/ui/empty-state", () => ({ EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div> }));
jest.mock("@/components/ui/stat-card", () => ({ StatCard: () => <div />, StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, StatCardGridSkeleton: () => <div /> }));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => <div>{title ? <h1>{title}</h1> : null}{children}</div>,
}));
jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));
jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
}));
jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: () => <div data-testid="build-list-toolbar" />,
}));
jest.mock("@/features/build/shared/bulk-action-bar", () => ({
  BulkActionBar: ({
    selectedCount,
    onBulkStatus,
    onBulkPriority,
    onBulkAssignee,
    onBulkCycle,
  }: {
    selectedCount: number;
    onBulkStatus?: (v: string) => void;
    onBulkPriority?: (v: string) => void;
    onBulkAssignee?: (v: string) => void;
    onBulkCycle?: (v: string) => void;
  }) => (
    <div data-testid="bulk-action-bar">
      {selectedCount}
      <button type="button" data-testid="bulk-status-btn" onClick={() => onBulkStatus?.("IN_PROGRESS")}>Status</button>
      <button type="button" data-testid="bulk-priority-btn" onClick={() => onBulkPriority?.("HIGH")}>Priority</button>
      <button type="button" data-testid="bulk-assignee-btn" onClick={() => onBulkAssignee?.("user-2")}>Assignee</button>
      <button type="button" data-testid="bulk-cycle-btn" onClick={() => onBulkCycle?.("5")}>Cycle</button>
    </div>
  ),
}));
jest.mock("framer-motion", () => ({
  motion: { div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div> },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/build/epics/epic-card", () => ({
  EpicCard: ({ epic }: { epic: { id: number; title: string } }) => (
    <div data-testid="epic-card" data-epic-id={epic.id}>{epic.title}</div>
  ),
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  useBuildListFilters: jest.fn(),
}));

import { useProject, useProjectBoardTickets, useUpdateTicket, useDeleteTicket, useCreateTicket, useBulkUpdateTickets, useCycles } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseProject = useProject as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseBulkUpdateTickets = useBulkUpdateTickets as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all", "build:tickets:create": "all", "build:tickets:update": "all" }, modules: { BUILD: true } },
  isLoading: false,
};

const EPIC_A = { id: 1, orgId: "o1", projectId: 1, title: "Epic Alpha", type: "EPIC", status: "TODO", priority: "MEDIUM", ticketNumber: 1, epicId: null, reporterId: "u1", points: null, storyPoints: null, link: null, rank: "1000", parentTicketId: null, originalEstimate: null, timeSpent: null, startDate: null, dueDate: null, moduleId: null, cycleId: null, sequenceId: "P-1", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01", assigneeId: null };
const EPIC_B = { ...EPIC_A, id: 2, title: "Epic Beta", ticketNumber: 2, sequenceId: "P-2", status: "IN_PROGRESS" };

const makeMutation = () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false });

const defaultFilters = { search: "", debouncedSearch: "", setSearch: jest.fn(), value: jest.fn(() => ""), setValue: jest.fn(), clearAll: jest.fn(), activeCount: 0, isFiltered: false };

const params = Promise.resolve({ projectId: "1" });

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue({ data: { id: 1, key: "P", statuses: [], settings: { modules: {} } }, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
  mockUseProjectBoardTickets.mockReturnValue({ data: [EPIC_A, EPIC_B], isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
  mockUseBulkUpdateTickets.mockReturnValue(makeMutation());
  mockUseCycles.mockReturnValue({ data: [] });
  mockUseBuildListFilters.mockReturnValue(defaultFilters);
  (useUpdateTicket as jest.Mock).mockReturnValue(makeMutation());
  (useDeleteTicket as jest.Mock).mockReturnValue(makeMutation());
  (useCreateTicket as jest.Mock).mockReturnValue(makeMutation());
  (require("@/features/build/shared/use-build-list-keyboard").useBuildListKeyboard as jest.Mock).mockReturnValue({});
});

it("search filter narrows displayed epics without showing the excluded title", async () => {
  mockUseBuildListFilters.mockReturnValue({ ...defaultFilters, debouncedSearch: "Beta" });

  await act(async () => { render(<EpicsPage params={params} />); });

  const cards = screen.getAllByTestId("epic-card");
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain("Beta");
  expect(screen.queryByText("Epic Alpha")).not.toBeInTheDocument();
});

it("status filter shows only epics that match the value and excludes the rest", async () => {
  mockUseBuildListFilters.mockReturnValue({ ...defaultFilters, value: (key: string) => key === "status" ? "TODO" : "" });

  await act(async () => { render(<EpicsPage params={params} />); });

  const cards = screen.getAllByTestId("epic-card");
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain("Alpha");
});

it("BulkActionBar appears with selected count when a row checkbox is checked", async () => {
  await act(async () => { render(<EpicsPage params={params} />); });

  expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();

  const checkboxes = screen.getAllByRole("checkbox");
  await act(async () => { fireEvent.click(checkboxes[0]); });

  const bar = screen.getByTestId("bulk-action-bar");
  expect(bar).toBeInTheDocument();
  expect(bar.textContent).toContain("1");
});

it("BulkActionBar count increments when a second checkbox is checked", async () => {
  await act(async () => { render(<EpicsPage params={params} />); });

  const checkboxes = screen.getAllByRole("checkbox");
  await act(async () => { fireEvent.click(checkboxes[0]); });
  await act(async () => { fireEvent.click(checkboxes[1]); });

  expect(screen.getByTestId("bulk-action-bar").textContent).toContain("2");
});

it("BulkActionBar calls useBulkUpdateTickets mutate when a status bulk action fires", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });

  await act(async () => { render(<EpicsPage params={params} />); });

  const checkboxes = screen.getAllByRole("checkbox");
  await act(async () => { fireEvent.click(checkboxes[0]); });

  expect(screen.getByTestId("bulk-action-bar")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-status-btn")); });

  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [1], status: "IN_PROGRESS" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});

it("BulkActionBar calls useBulkUpdateTickets mutate with priority when a priority bulk action fires", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });

  await act(async () => { render(<EpicsPage params={params} />); });

  const checkboxes = screen.getAllByRole("checkbox");
  await act(async () => { fireEvent.click(checkboxes[0]); });
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-priority-btn")); });

  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [1], priority: "HIGH" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});

it("BulkActionBar calls useBulkUpdateTickets mutate with assigneeId when an assignee bulk action fires", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });

  await act(async () => { render(<EpicsPage params={params} />); });

  const checkboxes = screen.getAllByRole("checkbox");
  await act(async () => { fireEvent.click(checkboxes[0]); });
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-assignee-btn")); });

  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [1], assigneeId: "user-2" },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  );
});
