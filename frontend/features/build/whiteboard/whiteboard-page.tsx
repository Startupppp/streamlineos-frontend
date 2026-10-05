"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import {
  useCreateWhiteboard,
  useDeleteWhiteboard,
  useUpdateWhiteboard,
  useWhiteboard,
  useWhiteboards,
  type ExcalidrawSceneData,
  type WhiteboardSummary,
} from "@/hooks/api/build/whiteboards";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { toast } from "sonner";
import { CreateBoardDialog } from "./create-board-dialog";
import { useWhiteboardAutosave } from "./use-whiteboard-autosave";
import { WhiteboardToolbar } from "./whiteboard-toolbar";
import { ShareDialog } from "./share-dialog";
import { computeStoredVersion, isExcalidrawScene } from "./scene-utils";
import {
  PmPageShell,
  PmPanel,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { BoardItem, MobileBoardChip } from "./whiteboard-board-item";

const BOARDS_COLLAPSED_KEY = "streamlineos:whiteboard:boards-collapsed";

const ExcalidrawCanvas = dynamic(
  () => import("./excalidraw-canvas").then((m) => m.ExcalidrawCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col flex-1 min-h-0">
        <Skeleton className="flex-1 rounded-lg" />
      </div>
    ),
  },
);

interface WhiteboardPageProps {
  projectId: number;
  initialBoardId: number | null;
}

export function WhiteboardPage({
  projectId,
  initialBoardId,
}: WhiteboardPageProps) {
  const canManage = useCan("build:whiteboards:manage");
  const {
    data: whiteboardPages,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useWhiteboards(projectId);
  const boards = useMemo(
    () => whiteboardPages?.pages.flatMap((p) => p.data) ?? [],
    [whiteboardPages],
  );

  const handleLoadMoreBoards = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
  });
  const createBoard = useCreateWhiteboard(projectId);
  const deleteBoard = useDeleteWhiteboard(projectId);

  const [chosenBoardId, setChosenBoardId] = useState<number | null>(
    initialBoardId,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhiteboardSummary | null>(
    null,
  );
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
  } = useWhiteboard(projectId, selectedBoard?.id ?? chosenBoardId ?? null);
  const updateBoard = useUpdateWhiteboard(projectId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const boardData = detail?.data;
  const initialVersion = computeStoredVersion(
    isExcalidrawScene(boardData) ? [...(boardData.elements ?? [])] : [],
  );

  const handleSaveAsync = useCallback(
    async (boardId: number, data: ExcalidrawSceneData) => {
      await updateBoard.mutateAsync({ whiteboardId: boardId, data });
    },
    [updateBoard],
  );
  const handleSaveError = useCallback(
    () => toast.error("Failed to save board"),
    [],
  );

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

  useRegisterDirtyState(saveStatus === "dirty");

  const manualSaveRef = useRef(manualSave);
  useEffect(() => { manualSaveRef.current = manualSave; }, [manualSave]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        manualSaveRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleFullscreen = useCallback(
    () => setIsFullscreen((prev) => !prev),
    [],
  );
  const handleExitFullscreen = useCallback(() => setIsFullscreen(false), []);
  const handleOpenShare = useCallback(() => setShareOpen(true), []);
  const handleShareOpenChange = useCallback(
    (open: boolean) => setShareOpen(open),
    [],
  );
  const handleDetailRetry = useCallback(() => refetchDetail(), [refetchDetail]);
  const handleBoardSelect = useCallback(
    (id: number) => setChosenBoardId(id),
    [],
  );
  const handleBoardDelete = useCallback(
    (board: WhiteboardSummary) => setDeleteTarget(board),
    [],
  );
  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
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
            shareToken={
              detail.sharing?.visibility === "public"
                ? detail.sharing.shareToken
                : null
            }
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
      subtitle={selectedBoard ? undefined : "Visual brainstorming for this project"}
      badge={visibilityBadge}
      leading={leadingToggle}
      noInternalScroll
      contentClassName="flex min-h-0"
      actions={headerActions}
    >
      <PmPageShell className="h-full min-h-0 gap-3">
        {pageState.kind === "loading" ? (
          <div className="flex-1">
            <LoadingState variant="page" />
          </div>
        ) : pageState.kind !== "ready" && pageState.kind !== "empty" ? (
          <PageState
            resolution={pageState}
            loading={null}
            onRetry={handleRefetch}
            className={CONTENT_FILL_PANEL}
          >
            {null}
          </PageState>
        ) : !boards || boards.length === 0 ? (
          <EmptyState
            illustrationPreset="documents"
            title="Create your first board"
            description="Whiteboards let your team brainstorm visually with sticky notes, shapes, arrows, and freehand drawing."
            action={
              canManage
                ? { label: "New Board", onClick: handleOpenCreate }
                : undefined
            }
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="flex min-h-0 flex-1 gap-3">
            {!listCollapsed ? (
              <PmPanel
                className="hidden w-48 shrink-0 flex-col rounded-xl p-2 md:flex"
                solid
              >
                <div className="mb-1 flex shrink-0 items-center px-1">
                  <span className="text-xs font-normal text-muted-foreground">
                    Boards
                  </span>
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
                  <InfiniteScrollSentinel
                    hasNextPage={hasNextPage ?? false}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={handleLoadMoreBoards}
                    label="Load more boards"
                  />
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
                <PmPanel
                  className="flex flex-1 items-center justify-center"
                  solid
                >
                  <EmptyState
                    illustrationPreset="documents"
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

      {detail !== undefined &&
        detail.access === "manage" &&
        detail.sharing !== null && (
          <ShareDialog
            projectId={projectId}
            whiteboard={detail}
            open={shareOpen}
            onOpenChange={handleShareOpenChange}
          />
        )}

      <ConfirmDialog
        open={canManage && !!deleteTarget}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete board?"
        description={`"${deleteTarget?.name ?? ""}" and all of its content will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteBoard.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
