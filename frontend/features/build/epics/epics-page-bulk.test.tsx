import React from "react";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import { EpicsPage } from "./epics-page";

jest.mock("@/hooks/api/build/projects", () => ({ useProject: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-queries", () => ({ useProjectBoardTickets: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-update-mutation", () => ({ useUpdateTicket: jest.fn() }));
jest.mock("@/hooks/api/build/ticket-create-rank-mutations", () => ({
  useDeleteTicket: jest.fn(),
  useCreateTicket: jest.fn(),
  useBulkUpdateTickets: jest.fn(),
}));
jest.mock("@/hooks/api/build/labels", () => ({
  useOrgLabels: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/build/ticket-import-export", () => ({
  useExportTickets: jest.fn(),
}));

jest.mock("@/features/build/import-export/download-text-file", () => ({
  downloadTextFile: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock("@/hooks/api/build/advanced", () => ({
  useCycles: jest.fn(),
  useEpicPage: jest.fn(),
}));
jest.mock("@/hooks/api/build/project-members", () => ({
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
  CONTENT_FILL_PANEL: "",
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
    onBulkLabel,
    onBulkParent,
    onBulkArchive,
    onBulkExport,
  }: {
    selectedCount: number;
    onBulkStatus?: (v: string) => void;
    onBulkPriority?: (v: string) => void;
    onBulkAssignee?: (v: string) => void;
    onBulkCycle?: (v: string) => void;
    onBulkLabel?: (v: string) => void;
    onBulkParent?: (v: number | null) => void;
    onBulkArchive?: () => void;
    onBulkExport?: () => void;
  }) => (
    <div data-testid="bulk-action-bar">
      {selectedCount}
      <button type="button" data-testid="bulk-status-btn" onClick={() => onBulkStatus?.("IN_PROGRESS")}>Status</button>
      <button type="button" data-testid="bulk-priority-btn" onClick={() => onBulkPriority?.("HIGH")}>Priority</button>
      <button type="button" data-testid="bulk-assignee-btn" onClick={() => onBulkAssignee?.("user-2")}>Assignee</button>
      <button type="button" data-testid="bulk-cycle-btn" onClick={() => onBulkCycle?.("5")}>Cycle</button>
      {onBulkLabel ? <button type="button" data-testid="bulk-label-btn" onClick={() => onBulkLabel("7")}>Label</button> : null}
      {onBulkParent ? <button type="button" data-testid="bulk-parent-btn" onClick={() => onBulkParent(42)}>Parent</button> : null}
      {onBulkArchive ? <button type="button" data-testid="bulk-archive-btn" onClick={onBulkArchive}>Archive</button> : null}
      {onBulkExport ? <button type="button" data-testid="bulk-export-btn" onClick={onBulkExport}>Export</button> : null}
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
  BUILD_FILTER_ALL: "all",
}));

import { useProject, useProjectBoardTickets, useUpdateTicket, useDeleteTicket, useCreateTicket, useBulkUpdateTickets, useCycles } from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useEpicPage } from "@/hooks/api/build/advanced";
import { useExportTickets } from "@/hooks/api/build/ticket-import-export";
import { downloadTextFile } from "@/features/build/import-export/download-text-file";
import { toast } from "sonner";

const mockUseProject = useProject as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseBulkUpdateTickets = useBulkUpdateTickets as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;
const mockUseEpicPage = useEpicPage as jest.Mock;

function epicPage(rows: unknown[]) {
  return {
    data: { data: rows, pagination: { limit: 25, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: undefined,
    dataUpdatedAt: 0,
    refetch: jest.fn(),
  };
}

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:view": "all", "build:tickets:create": "all", "build:tickets:update": "all" }, modules: { BUILD: true } },
  isLoading: false,
};

const EPIC_A = { id: 1, orgId: "o1", projectId: 1, title: "Epic Alpha", type: "EPIC", status: "TODO", priority: "MEDIUM", ticketNumber: 1, epicId: null, reporterId: "u1", points: null, storyPoints: null, link: null, rank: "1000", parentTicketId: null, originalEstimate: null, timeSpent: null, startDate: null, dueDate: null, moduleId: null, cycleId: null, sequenceId: "P-1", estimate: null, createdAt: "2026-09-01", updatedAt: "2026-09-01", assigneeId: null };
const EPIC_B = { ...EPIC_A, id: 2, title: "Epic Beta", ticketNumber: 2, sequenceId: "P-2", status: "IN_PROGRESS" };

const makeMutation = () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false });

const defaultFilters = { search: "", debouncedSearch: "", setSearch: jest.fn(), value: jest.fn(() => "all"), isActive: jest.fn(() => false), setValue: jest.fn(), clearAll: jest.fn(), activeCount: 0, isFiltered: false, cursor: null, setCursor: jest.fn() };

const params = Promise.resolve({ projectId: "1" });

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseProject.mockReturnValue({ data: { id: 1, key: "P", statuses: [], settings: { modules: {} } }, isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
  mockUseProjectBoardTickets.mockReturnValue({ data: [EPIC_A, EPIC_B], isLoading: false, isError: false, error: undefined, refetch: jest.fn() });
  mockUseEpicPage.mockReturnValue(epicPage([EPIC_A, EPIC_B]));
  mockUseBulkUpdateTickets.mockReturnValue(makeMutation());
  mockUseCycles.mockReturnValue({ data: [] });
  mockUseBuildListFilters.mockReturnValue(defaultFilters);
  (useUpdateTicket as jest.Mock).mockReturnValue(makeMutation());
  (useDeleteTicket as jest.Mock).mockReturnValue(makeMutation());
  (useCreateTicket as jest.Mock).mockReturnValue(makeMutation());
  (require("@/features/build/shared/use-build-list-keyboard").useBuildListKeyboard as jest.Mock).mockReturnValue({});
  (useExportTickets as jest.Mock).mockReturnValue(makeMutation());
  (toast.success as jest.Mock).mockClear();
  (toast.error as jest.Mock).mockClear();
  (toast.warning as jest.Mock).mockClear();
  (downloadTextFile as jest.Mock).mockClear();
});

it("sends the search term to the epic read and renders the page it returns, instead of filtering rows here", async () => {
  mockUseBuildListFilters.mockReturnValue({ ...defaultFilters, debouncedSearch: "Beta" });
  mockUseEpicPage.mockReturnValue(epicPage([EPIC_B]));

  await act(async () => { render(<EpicsPage params={params} />); });

  expect(mockUseEpicPage).toHaveBeenCalledWith(1, expect.objectContaining({ q: "Beta" }));
  const cards = screen.getAllByTestId("epic-card");
  expect(cards).toHaveLength(1);
  expect(cards[0].textContent).toContain("Beta");
  expect(screen.queryByText("Epic Alpha")).not.toBeInTheDocument();
});

it("sends the status filter to the epic read and renders the page it returns", async () => {
  mockUseBuildListFilters.mockReturnValue({ ...defaultFilters, value: (key: string) => key === "status" ? "TODO" : "all" });
  mockUseEpicPage.mockReturnValue(epicPage([EPIC_A]));

  await act(async () => { render(<EpicsPage params={params} />); });

  expect(mockUseEpicPage).toHaveBeenCalledWith(1, expect.objectContaining({ status: "TODO" }));
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

async function selectFirstEpic() {
  await act(async () => { render(<EpicsPage params={params} />); });
  const checkboxes = screen.getAllByRole("checkbox");
  await act(async () => { fireEvent.click(checkboxes[0]); });
}

it("offers label, parent, archive and export in the bulk bar, so the contract's bulk set is reachable", async () => {
  await selectFirstEpic();
  expect(screen.getByTestId("bulk-label-btn")).toBeInTheDocument();
  expect(screen.getByTestId("bulk-parent-btn")).toBeInTheDocument();
  expect(screen.getByTestId("bulk-archive-btn")).toBeInTheDocument();
  expect(screen.getByTestId("bulk-export-btn")).toBeInTheDocument();
});

it("sends the chosen label to the bulk mutation rather than dropping it", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });
  await selectFirstEpic();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-label-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [1], labelIds: [7] },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  );
});

it("sends the chosen parent to the bulk mutation, covering the contract's move/link action", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });
  await selectFirstEpic();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-parent-btn")); });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [1], parentTicketId: 42 },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  );
});

it("confirms before archiving and only then sends the archive flag, because archive is a lifecycle action", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });
  await selectFirstEpic();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-archive-btn")); });
  expect(bulkMutate).not.toHaveBeenCalled();
  const dialog = screen.getByRole("alertdialog");
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));
  });
  expect(bulkMutate).toHaveBeenCalledWith(
    { ticketIds: [1], archive: true },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  );
});

it("reports a partial bulk result per record instead of claiming every row moved", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });
  await selectFirstEpic();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-status-btn")); });
  const options = bulkMutate.mock.calls[0][1];
  act(() => {
    options.onSuccess({ updated: 1, ticketIds: [1], blocked: [{ ticketId: 2, reason: "open subtasks", dependencyCount: 1 }] });
  });
  expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("1 updated, 1 could not be changed"));
  expect(toast.success).not.toHaveBeenCalled();
});

it("says nothing changed when every selected row was blocked, rather than reporting a success of zero", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });
  await selectFirstEpic();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-status-btn")); });
  const options = bulkMutate.mock.calls[0][1];
  act(() => {
    options.onSuccess({ updated: 0, ticketIds: [], blocked: [{ ticketId: 1, reason: "open subtasks", dependencyCount: 2 }] });
  });
  expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Nothing was changed"));
});

it("reports plain success when the server blocked nothing, so the partial branch is not always on", async () => {
  const bulkMutate = jest.fn();
  mockUseBulkUpdateTickets.mockReturnValue({ ...makeMutation(), mutate: bulkMutate });
  await selectFirstEpic();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-status-btn")); });
  const options = bulkMutate.mock.calls[0][1];
  act(() => { options.onSuccess({ updated: 2, ticketIds: [1, 2] }); });
  expect(toast.success).toHaveBeenCalledWith("2 epics updated");
  expect(toast.warning).not.toHaveBeenCalled();
});

it("downloads the exported rows instead of only reporting a count", async () => {
  const exportMutate = jest.fn();
  (useExportTickets as jest.Mock).mockReturnValue({ ...makeMutation(), mutate: exportMutate });
  await selectFirstEpic();
  await act(async () => { fireEvent.click(screen.getByTestId("bulk-export-btn")); });
  expect(exportMutate).toHaveBeenCalledWith(
    { format: "csv", ticketIds: [1] },
    expect.objectContaining({ onSuccess: expect.any(Function) }),
  );
  const options = exportMutate.mock.calls[0][1];
  act(() => {
    options.onSuccess({ filename: "epics.csv", contentType: "text/csv", content: "id\n1", rowCount: 1 });
  });
  expect(downloadTextFile).toHaveBeenCalledWith("epics.csv", "text/csv", "id\n1");
});
