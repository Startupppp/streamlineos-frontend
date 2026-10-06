import { useCallback, useMemo, useRef, useState } from "react";
import { useProject, useProjectLabels } from "@/hooks/api/build/projects";
import { useUpdateTicket } from "@/hooks/api/build/ticket-update-mutation";
import {
  useCreateTicket,
  useDeleteTicket,
} from "@/hooks/api/build/ticket-create-rank-mutations";
import { useBulkUpdateTickets } from "@/hooks/api/build/ticket-bulk-update-mutation";
import { useProjectBoardTickets } from "@/hooks/api/build/ticket-queries";
import {
  useEpicPage,
  type EpicListFilters,
} from "@/hooks/api/build/epics";
import { useCycles } from "@/hooks/api/build/cycles";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useExportTickets } from "@/hooks/api/build/ticket-import-export";
import { useCan } from "@/hooks/api/access";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { useEpicBulkActions } from "./use-epic-bulk-actions";
import {
  EPIC_FILTER_DEFINITIONS,
} from "./epics-filter-toolbar";

const EPIC_PAGE_SIZE = 25;
const EMPTY_CURSORS: readonly (string | null)[] = [];

export function useEpicsPage(projectIdStr: string) {
  const projectId = parseInt(projectIdStr);
  const canCreate = useCan("build:tickets:create");
  const canUpdate = useCan("build:tickets:update");
  const isOnline = useOnlineStatus();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listFilters = useBuildListFilters({
    filters: EPIC_FILTER_DEFINITIONS,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const {
    data: project,
    isLoading: projectLoading,
    isError: projectFailed,
    error: projectError,
    refetch: refetchProject,
  } = useProject(projectId);
  const {
    data: boardTickets,
    isLoading: ticketsLoading,
    isError: ticketsFailed,
    error: ticketsError,
    refetch: refetchTickets,
  } = useProjectBoardTickets(projectId);
  const { data: cycles } = useCycles(projectId);
  const { data: orgLabels } = useProjectLabels();
  const exportEpics = useExportTickets(projectId);
  const { data: membersPage } = useProjectMembers(projectId);
  const members = membersPage?.data ?? [];

  const statusFilter = listFilters.value("status");
  const ownerFilter = listFilters.value("ownerId");
  const healthFilter = listFilters.value("health");
  const epicFilters: EpicListFilters = {
    q: listFilters.debouncedSearch || undefined,
    status: statusFilter !== BUILD_FILTER_ALL ? statusFilter : undefined,
    ownerId: ownerFilter !== BUILD_FILTER_ALL ? ownerFilter : undefined,
    health:
      healthFilter === "on_track" ||
      healthFilter === "at_risk" ||
      healthFilter === "off_track"
        ? healthFilter
        : undefined,
    cursor: listFilters.cursor ?? undefined,
    limit: EPIC_PAGE_SIZE,
  };
  const {
    data: epicPage,
    isLoading: epicsLoading,
    isError: epicsFailed,
    error: epicsError,
    refetch: refetchEpics,
    dataUpdatedAt: epicsUpdatedAt,
  } = useEpicPage(projectId, epicFilters);

  const isLoading = projectLoading || ticketsLoading || epicsLoading;
  const readFailed = projectFailed || epicsFailed || ticketsFailed;
  const loadError = projectError ?? epicsError ?? ticketsError;

  const handleRetry = useCallback(() => {
    void refetchProject();
    void refetchEpics();
    void refetchTickets();
  }, [refetchEpics, refetchProject, refetchTickets]);

  const updateTicket = useUpdateTicket(projectId);
  const deleteTicket = useDeleteTicket(projectId);
  const createTicket = useCreateTicket();
  const bulkUpdate = useBulkUpdateTickets(projectId);

  const tickets = useMemo(() => boardTickets ?? [], [boardTickets]);
  const epics = useMemo(() => epicPage?.data ?? [], [epicPage]);
  const hasMoreEpics = epicPage?.pagination.hasMore ?? false;
  const nextEpicCursor = epicPage?.pagination.nextCursor ?? null;
  const [visitedCursors, setVisitedCursors] = useState<(string | null)[]>([]);
  const urlCursor = listFilters.cursor;

  const history = urlCursor === null ? EMPTY_CURSORS : visitedCursors;

  const handleNextPage = useCallback(() => {
    if (!nextEpicCursor) return;
    setVisitedCursors([...history, urlCursor]);
    listFilters.setCursor(nextEpicCursor);
  }, [listFilters, nextEpicCursor, urlCursor, history]);

  const handlePreviousPage = useCallback(() => {
    const previous = history[history.length - 1] ?? null;
    setVisitedCursors([...history.slice(0, -1)]);
    listFilters.setCursor(previous);
  }, [listFilters, history]);

  const allEpics = useMemo(() => tickets.filter((t) => t.type === "EPIC"), [tickets]);
  const stories = useMemo(() => tickets.filter((t) => t.type === "STORY"), [tickets]);
  const tasks = useMemo(() => tickets.filter((t) => t.type === "TASK"), [tickets]);

  const handleDeleteEpic = useCallback(
    (epicId: number) =>
      deleteTicket.mutate(
        { ticketId: epicId },
        {
          onSuccess: () => toast.success("Epic deleted"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
    [deleteTicket],
  );
  const handleLinkStory = useCallback(
    (storyId: number, epicId: number) => {
      const story = tickets.find((t) => t.id === storyId);
      if (!story) return;
      updateTicket.mutate({
        ticketId: storyId,
        version: story.version,
        epicId,
      });
    },
    [updateTicket, tickets],
  );
  const handleCreateStory = useCallback(
    (title: string, epicId: number) =>
      createTicket.mutate(
        { projectId, title, type: "STORY", epicId },
        {
          onSuccess: () => toast.success("Story created"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
    [createTicket, projectId],
  );

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError: readFailed,
    error: loadError,
  });

  const bulkActions = useEpicBulkActions({ bulkUpdate, exportEpics });

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCreateOpenChange = useCallback(
    (open: boolean) => setCreateOpen(open),
    [],
  );
  const handleEditByIndex = useCallback(
    (index: number) => {
      const epic = epics[index];
      if (epic) setEditTargetId(epic.id);
    },
    [epics],
  );
  const handleEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditTargetId(null);
  }, []);
  const keyboardEditTarget =
    editTargetId === null
      ? null
      : (epics.find((epic) => epic.id === editTargetId) ?? null);
  const handleShortcutHelp = useCallback(
    () => setShortcutHelpOpen(true),
    [],
  );

  useBuildListKeyboard({
    itemCount: epics.length,
    onOpen: handleEditByIndex,
    onEdit: handleEditByIndex,
    onCreate: canCreate ? handleOpenCreate : undefined,
    onClearSelection: bulkActions.handleClearSelection,
    onShortcutHelp: handleShortcutHelp,
    enabled: pageState.kind === "ready",
    searchInputRef,
  });

  return {
    projectId,
    canCreate,
    canUpdate,
    isOnline,
    searchInputRef,
    listFilters,
    project,
    pageState,
    isLoading,
    epicsUpdatedAt,
    tickets,
    epics,
    allEpics,
    stories,
    tasks,
    hasMoreEpics,
    visitedCursors: history,
    cycles,
    orgLabels,
    members,
    deleteTicket,
    bulkUpdate,
    createOpen,
    editTargetId,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    keyboardEditTarget,
    handleRetry,
    handleNextPage,
    handlePreviousPage,
    handleDeleteEpic,
    handleLinkStory,
    handleCreateStory,
    handleOpenCreate,
    handleCreateOpenChange,
    handleEditByIndex,
    handleEditOpenChange,
    handleShortcutHelp,
    ...bulkActions,
  };
}
