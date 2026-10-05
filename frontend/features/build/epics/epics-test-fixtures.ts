import type { UseMutationResult } from "@tanstack/react-query";
import type { useUpdateTicket, useDeleteTicket, useCreateTicket, useBulkUpdateTickets } from "@/hooks/api/build";
import type { Cycle, ProjectWithDetails, Ticket } from "@/types/projects";
import type { EpicPage, EpicItem } from "@/hooks/api/build/execution-schema";
import {
  pendingQuery,
  successfulQuery,
  failedQuery,
  boardQueryResult,
  mockUseCan,
  mockUseAccess,
  ACCESS_GRANTED,
  mockUseProject,
  mockUseProjectBoardTickets,
  mockUseUpdateTicket,
  mockUseDeleteTicket,
  mockUseCreateTicket,
  mockUseBulkUpdateTickets,
  mockUseCycles,
  mockUseBuildListKeyboard,
  mockUseBuildListFilters,
  mockUseEpicPage,
  mockUseOnlineStatus,
  makeMutationResult,
  disabledQueryResult,
} from "./epics-page-test-harness";

type MutationParts<T> = T extends UseMutationResult<
  infer Data,
  infer Err,
  infer Variables,
  infer Context
>
  ? [Data, Err, Variables, Context]
  : never;

export const EPIC_ROW = {
  id: 11,
  orgId: "org-1",
  projectId: 1,
  title: "Epic Health",
  type: "EPIC",
  status: "TODO",
  priority: "MEDIUM",
  ticketNumber: 11,
  epicId: null,
  reporterId: "user-1",
  points: null,
  storyPoints: null,
  link: null,
  rank: "1000",
  parentTicketId: null,
  originalEstimate: null,
  timeSpent: null,
  startDate: null,
  dueDate: null,
  moduleId: null,
  cycleId: null,
  sequenceId: "TEST-11",
  estimate: null,
  health: "at_risk",
  createdAt: "2026-09-01",
  updatedAt: "2026-09-01",
  assigneeId: null,
};

const EPIC_TYPES = ["EPIC", "STORY", "TASK", "BUG"] as const;
const EPIC_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

function toEpicItem(t: Ticket): EpicItem {
  return {
    id: t.id,
    orgId: t.orgId,
    title: t.title,
    description: t.description ?? null,
    type: EPIC_TYPES.find((v) => v === t.type) ?? "EPIC",
    status: t.status,
    priority: EPIC_PRIORITIES.find((v) => v === t.priority) ?? "LOW",
    health: t.health ?? null,
    projectId: t.projectId,
    ticketNumber: t.ticketNumber,
    cycleId: t.cycleId ?? null,
    epicId: t.epicId ?? null,
    assigneeMembershipId: null,
    points: t.points ?? null,
    storyPoints: t.storyPoints ?? null,
    startDate: t.startDate ?? null,
    dueDate: t.dueDate ?? null,
    estimate: t.estimate ?? null,
    completionPercentage: 0,
    rank: t.rank ?? "",
    timeSpent: t.timeSpent ?? "",
    version: t.version,
    dependencyCount: t.dependencyCount ?? 0,
    deletedAt: null,
    createdAt: typeof t.createdAt === "string" ? t.createdAt : "",
    updatedAt: typeof t.updatedAt === "string" ? t.updatedAt : "",
    assignee: t.assignee
      ? {
          id: t.assignee.id,
          name: t.assignee.name ?? null,
          firstName: t.assignee.firstName ?? null,
          lastName: t.assignee.lastName ?? null,
          image: t.assignee.image ?? null,
          email: t.assignee.email ?? "",
        }
      : null,
  };
}

export function epicPageResult(
  rows: Ticket[],
  overrides: {
    hasMore?: boolean;
    nextCursor?: string | null;
    dataUpdatedAt?: number;
    isLoading?: boolean;
    isError?: boolean;
    error?: unknown;
    refetch?: () => void;
  } = {},
) {
  const { hasMore = false, nextCursor = null, ...rest } = overrides;
  const page: EpicPage = {
    data: rows.map(toEpicItem),
    pagination: { limit: 25, hasMore, nextCursor },
  };
  if (rest.isError) {
    const result = failedQuery<typeof page>(
      rest.error instanceof Error ? rest.error : new Error("Epics unavailable"),
    );
    if (!rest.refetch) return result;
    return {
      ...result,
      refetch: async () => {
        rest.refetch?.();
        return result;
      },
    };
  }
  if (rest.isLoading) return pendingQuery<typeof page>();
  const result = successfulQuery(page, rest.dataUpdatedAt ?? 0);
  if (!rest.refetch) return result;
  return {
    ...result,
    refetch: async () => {
      rest.refetch?.();
      return result;
    },
  };
}

export function installEpicsPageMocks() {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  const project: ProjectWithDetails = {
    id: 1,
    orgId: "org-1",
    name: "Test project",
    description: null,
    key: "TEST",
    managedProductId: null,
    startDate: null,
    endDate: null,
    status: null,
    settings: { modules: { epics: true, timeTracking: false, wiki: false } },
    statuses: [],
  };
  mockUseProject.mockReturnValue(successfulQuery<ProjectWithDetails | null>(project));
  mockUseProjectBoardTickets.mockReturnValue(boardQueryResult([]));
  type UpdateParts = MutationParts<ReturnType<typeof useUpdateTicket>>;
  type DeleteParts = MutationParts<ReturnType<typeof useDeleteTicket>>;
  type CreateParts = MutationParts<ReturnType<typeof useCreateTicket>>;
  type BulkParts = MutationParts<ReturnType<typeof useBulkUpdateTickets>>;
  mockUseUpdateTicket.mockReturnValue(
    makeMutationResult<UpdateParts[0], UpdateParts[1], UpdateParts[2], UpdateParts[3]>(),
  );
  mockUseDeleteTicket.mockReturnValue(
    makeMutationResult<DeleteParts[0], DeleteParts[1], DeleteParts[2], DeleteParts[3]>(),
  );
  mockUseCreateTicket.mockReturnValue(
    makeMutationResult<CreateParts[0], CreateParts[1], CreateParts[2], CreateParts[3]>(),
  );
  mockUseBulkUpdateTickets.mockReturnValue(
    makeMutationResult<BulkParts[0], BulkParts[1], BulkParts[2], BulkParts[3]>(),
  );
  mockUseCycles.mockReturnValue(disabledQueryResult<Cycle[]>());
  mockUseBuildListKeyboard.mockReturnValue({ focusedIndex: null, setFocusedIndex: jest.fn() });
  mockUseBuildListFilters.mockReturnValue({
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    value: jest.fn(() => "all"),
    isActive: jest.fn(() => false),
    setValue: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    cursor: null,
    setCursor: jest.fn(),
    resetKey: "",
    isPending: false,
  });
  mockUseEpicPage.mockReturnValue(epicPageResult([]));
  mockUseOnlineStatus.mockReturnValue(true);
}

export function readyPage(tickets: Ticket[], updatedAt = 0) {
  mockUseProjectBoardTickets.mockReturnValue(boardQueryResult(tickets));
  mockUseEpicPage.mockReturnValue(
    epicPageResult(tickets.filter((t) => t.type === "EPIC"), { dataUpdatedAt: updatedAt }),
  );
}

export function filtersReturning(values: Record<string, string>, isFiltered = true) {
  return {
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    value: (key: string) => values[key] ?? "all",
    isActive: (key: string) => key in values,
    setValue: jest.fn(),
    clearAll: jest.fn(),
    activeCount: Object.keys(values).length,
    isFiltered,
    cursor: null,
    setCursor: jest.fn(),
    resetKey: "",
    isPending: false,
  };
}

export const params = Promise.resolve({ projectId: "1" });
