"use client";

import { use, memo, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  StickyNote,
  Lock,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  useWhiteboards,
  useWhiteboard,
  useCreateWhiteboard,
  useDeleteWhiteboard,
  useUpdateWhiteboard,
  type WhiteboardSummary,
  type ExcalidrawSceneData,
} from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { toast } from "sonner";
import { CreateBoardDialog } from "@/features/projects/whiteboard/create-board-dialog";
import { useWhiteboardAutosave } from "@/features/projects/whiteboard/use-whiteboard-autosave";
import { WhiteboardToolbar } from "@/features/projects/whiteboard/whiteboard-toolbar";
import { ShareDialog } from "@/features/projects/whiteboard/share-dialog";
import { computeStoredVersion } from "@/features/projects/whiteboard/scene-utils";
import {
  PmPageShell,
  PmPanel,
  PM_FILL_PANEL,
  PM_ROW,
} from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { getErrorMessage } from "@/lib/get-error-message";

const BOARDS_COLLAPSED_KEY = "streamlineos:whiteboard:boards-collapsed";

const ExcalidrawCanvas = dynamic(
  () =>
    import("@/features/projects/whiteboard/excalidraw-canvas").then(
      (m) => m.ExcalidrawCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col flex-1 min-h-0">
        <Skeleton className="flex-1 rounded-lg" />
      </div>
    ),
  },
);

interface BoardItemProps {
  board: WhiteboardSummary;
  isSelected: boolean;
  canManage: boolean;
  onSelect: (id: number) => void;
  onDelete: (board: WhiteboardSummary) => void;
}

const BoardItem = memo(function BoardItem({
  board,
  isSelected,
  canManage,
  onSelect,
  onDelete,
}: BoardItemProps) {
  const handleSelect = useCallback(() => onSelect(board.id), [onSelect, board.id]);
  const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onDelete(board);
    },
    [onDelete, board],
  );
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSelect();
  }

  const visibilityIcon =
    board.visibility === "private" ? (
      <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="Private" />
    ) : board.visibility === "public" ? (
      <Globe className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-label="Public" />
    ) : null;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={cn(
          PM_ROW,
          "cursor-pointer border-0 last:border-b-0 text-sm",
          isSelected
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground",
        )}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className={cn("flex items-center gap-1 font-medium", TEXT_ONE_LINE)}>
            <span className={TEXT_ONE_LINE}>{board.name}</span>
            {visibilityIcon}
          </p>
          <p className={cn("text-[11px] text-muted-foreground", TEXT_ONE_LINE)}>
            {board.elementCount} {board.elementCount === 1 ? "item" : "items"}
          </p>
        </div>
        {canManage && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            aria-label="Delete board"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </li>
  );
});

const MobileBoardChip = memo(function MobileBoardChip({
  board,
  isSelected,
  onSelect,
}: {
  board: WhiteboardSummary;
  isSelected: boolean;
  onSelect: (id: number) => void;
}) {
  const handleClick = useCallback(() => onSelect(board.id), [onSelect, board.id]);
  return (
    <button
      onClick={handleClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
        isSelected
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {board.name}
    </button>
  );
});

export default function WhiteboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ board?: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const { board: boardParam } = use(searchParams);
  const projectId = Number(projectIdStr);

  const canManage = useCan("projects:whiteboards:manage");
  const { data: boards, isLoading, isError, refetch } = useWhiteboards(projectId);
  const createBoard = useCreateWhiteboard(projectId);
  const deleteBoard = useDeleteWhiteboard(projectId);

  const initialBoardId = boardParam !== undefined ? Number(boardParam) : Number.NaN;
  const [chosenBoardId, setChosenBoardId] = useState<number | null>(
    Number.isInteger(initialBoardId) ? initialBoardId : null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhiteboardSummary | null>(null);
  const [listCollapsed, setListCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(BOARDS_COLLAPSED_KEY) === "true";
  });

  const selectedBoard = useMemo(() => {
    if (!boards || boards.length === 0) return null;
    return boards.find((b) => b.id === chosenBoardId) ?? boards[0];
  }, [boards, chosenBoardId]);

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useWhiteboard(projectId, selectedBoard?.id ?? null);
  const updateBoard = useUpdateWhiteboard(projectId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const initialVersion = computeStoredVersion(detail?.data.elements ?? []);

  const handleSaveAsync = useCallback(
    async (boardId: number, data: ExcalidrawSceneData) => {
      await updateBoard.mutateAsync({ id: boardId, data });
    },
    [updateBoard],
  );
  const handleSaveError = useCallback(() => toast.error("Failed to save board"), []);

  const {
    status: saveStatus,
    handleSceneChange,
    manualSave,
  } = useWhiteboardAutosave({
    boardId: selectedBoard?.id ?? null,
    access: detail?.access ?? "view",
    initialVersion,
    saveAsync: handleSaveAsync,
    onSaveError: handleSaveError,
  });

  const handleToggleFullscreen = useCallback(() => setIsFullscreen((prev) => !prev), []);
  const handleExitFullscreen = useCallback(() => setIsFullscreen(false), []);
  const handleOpenShare = useCallback(() => setShareOpen(true), []);
  const handleShareOpenChange = useCallback((open: boolean) => setShareOpen(open), []);
  const handleDetailRetry = useCallback(() => refetchDetail(), [refetchDetail]);

  const handleBoardSelect = useCallback((id: number) => setChosenBoardId(id), []);
  const handleBoardDelete = useCallback((board: WhiteboardSummary) => setDeleteTarget(board), []);
  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRefetch = useCallback(() => refetch(), [refetch]);
  const handleToggleList = useCallback(() => {
    setListCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(BOARDS_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  function handleCreate(name: string) {
    createBoard.mutate(name, {
      onSuccess: (board) => {
        toast.success("Board created");
        setChosenBoardId(board.id);
        setCreateOpen(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteBoard.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Board deleted");
        if (chosenBoardId === deleteTarget.id) setChosenBoardId(null);
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const visibilityBadge =
    selectedBoard?.visibility === "private"
      ? "Private"
      : selectedBoard?.visibility === "public"
        ? "Public"
        : undefined;

  const leadingToggle =
    boards && boards.length > 0 ? (
      <Button
        variant="ghost"
        size="icon"
        className="w-8 shrink-0 mt-0.5 hidden md:inline-flex"
        onClick={handleToggleList}
        aria-label={listCollapsed ? "Show boards panel" : "Hide boards panel"}
      >
        {listCollapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>
    ) : undefined;

  const showToolbar = Boolean(detail && selectedBoard);
  const headerActions =
    showToolbar || canManage ? (
      <>
        {detail !== undefined && selectedBoard !== null && (
          <WhiteboardToolbar
            saveStatus={saveStatus}
            isViewMode={detail.access === "view"}
            canManage={detail.access === "manage"}
            isFullscreen={isFullscreen}
            shareToken={detail.sharing?.shareToken ?? null}
            onManualSave={manualSave}
            onToggleFullscreen={handleToggleFullscreen}
            onOpenShare={handleOpenShare}
          />
        )}
        {canManage && (
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Board
          </Button>
        )}
      </>
    ) : undefined;

  return (
    <PageWrapper
      title={selectedBoard?.name ?? "Whiteboard"}
      badge={visibilityBadge}
      leading={leadingToggle}
      noInternalScroll
      contentClassName="flex min-h-0"
      actions={headerActions}
    >
      <PmPageShell className="h-full min-h-0 gap-3" withGlow={false}>
        {isLoading ? (
          <div className="flex-1">
            <LoadingState variant="page" />
          </div>
        ) : isError ? (
          <ErrorState className={PM_FILL_PANEL} onRetry={handleRefetch} />
        ) : !boards || boards.length === 0 ? (
          <EmptyState
            illustration={<EmptyUploadIllustration />}
            title="Create your first board"
            description="Whiteboards let your team brainstorm visually with sticky notes, shapes, arrows, and freehand drawing."
            action={canManage ? { label: "New Board", onClick: handleOpenCreate } : undefined}
            className={PM_FILL_PANEL}
          />
        ) : (
          <div className="flex min-h-0 flex-1 gap-3">
            {!listCollapsed ? (
              <PmPanel className="hidden w-48 shrink-0 flex-col rounded-xl p-2 md:flex" solid>
                <div className="mb-1 flex shrink-0 items-center px-1">
                  <span className="text-xs font-medium text-muted-foreground">Boards</span>
                </div>
                <ScrollArea hideScrollbar className="min-h-0 flex-1">
                  <ul className="space-y-0.5">
                  {boards.map((board) => (
                    <BoardItem
                      key={board.id}
                      board={board}
                      isSelected={board.id === (selectedBoard?.id ?? null)}
                      canManage={canManage}
                      onSelect={handleBoardSelect}
                      onDelete={handleBoardDelete}
                    />
                  ))}
                  </ul>
                </ScrollArea>
              </PmPanel>
            ) : null}

            <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border pb-1 md:hidden">
              {boards.map((board) => (
                <MobileBoardChip
                  key={board.id}
                  board={board}
                  isSelected={board.id === (selectedBoard?.id ?? null)}
                  onSelect={handleBoardSelect}
                />
              ))}
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {selectedBoard ? (
                detailLoading ? (
                  <LoadingState variant="page" />
                ) : detailError || !detail ? (
                  <ErrorState onRetry={handleDetailRetry} />
                ) : (
                  <ExcalidrawCanvas
                    key={selectedBoard.id}
                    detail={detail}
                    isFullscreen={isFullscreen}
                    saveStatus={saveStatus}
                    onSceneChange={handleSceneChange}
                    onExitFullscreen={handleExitFullscreen}
                  />
                )
              ) : (
                <PmPanel className="flex flex-1 items-center justify-center" solid>
                  <EmptyState
                    illustration={<EmptyUploadIllustration />}
                    title="Select a board"
                    description="Choose a board from the list to start editing."
                    compact
                  />
                </PmPanel>
              )}
            </div>
          </div>
        )}
      </PmPageShell>

      {canManage && (
        <CreateBoardDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreate={handleCreate}
          isPending={createBoard.isPending}
        />
      )}

      {detail !== undefined && detail.access === "manage" && detail.sharing !== null && (
        <ShareDialog
          projectId={projectId}
          whiteboard={detail}
          open={shareOpen}
          onOpenChange={handleShareOpenChange}
        />
      )}

      <AlertDialog open={canManage && !!deleteTarget} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete board?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; and all of its content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
