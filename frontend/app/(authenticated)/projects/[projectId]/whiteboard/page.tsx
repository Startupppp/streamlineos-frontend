"use client";

import { use, memo, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useWhiteboardAutosave } from "@/features/projects/whiteboard/use-whiteboard-autosave";
import { WhiteboardToolbar } from "@/features/projects/whiteboard/whiteboard-toolbar";
import { ShareDialog } from "@/features/projects/whiteboard/share-dialog";
import { computeStoredVersion } from "@/features/projects/whiteboard/scene-utils";

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

function CreateBoardDialog({
  open,
  onOpenChange,
  onCreate,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setName(event.target.value);
  }
  function handleSubmit() {
    if (!name.trim()) return;
    onCreate(name.trim());
  }
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleSubmit();
  }
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setName("");
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label>Board name</Label>
          <Input
            autoFocus
            placeholder="e.g. Sprint brainstorm"
            value={name}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
          "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
          isSelected
            ? "bg-brand-core/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium flex items-center gap-1">
            {board.name}
            {visibilityIcon}
          </p>
          <p className="text-[11px] text-muted-foreground">
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
          ? "bg-brand-core/10 text-primary"
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
      onError: () => toast.error("Failed to create board"),
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
      onError: () => toast.error("Failed to delete board"),
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
        className="h-8 w-8 shrink-0 mt-0.5 hidden md:inline-flex"
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
            listCollapsed={listCollapsed}
            shareToken={detail.sharing?.shareToken ?? null}
            onManualSave={manualSave}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleList={handleToggleList}
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
      eyebrow="Project"
      badge={visibilityBadge}
      leading={leadingToggle}
      noInternalScroll
      contentClassName="flex min-h-0"
      actions={headerActions}
    >
      {isLoading ? (
        <div className="flex-1">
          <LoadingState variant="page" />
        </div>
      ) : isError ? (
        <div className="flex flex-1 items-center justify-center">
          <ErrorState onRetry={handleRefetch} />
        </div>
      ) : !boards || boards.length === 0 ? (
        <div className="flex flex-1">
          <EmptyState
            illustration={<EmptyUploadIllustration />}
            title="Create your first board"
            description="Whiteboards let your team brainstorm visually with sticky notes, shapes, arrows, and freehand drawing."
            action={canManage ? { label: "New Board", onClick: handleOpenCreate } : undefined}
            className="flex-1"
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-3">
          {!listCollapsed && (
            <aside className="w-48 shrink-0 border-r border-border pr-3 hidden md:flex md:flex-col">
              <div className="flex items-center mb-1 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">Boards</span>
              </div>
              <ul className="space-y-0.5 overflow-y-auto flex-1 min-h-0">
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
            </aside>
          )}

          <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-border shrink-0 md:hidden">
            {boards.map((board) => (
              <MobileBoardChip
                key={board.id}
                board={board}
                isSelected={board.id === (selectedBoard?.id ?? null)}
                onSelect={handleBoardSelect}
              />
            ))}
          </div>

          <div className="flex flex-1 min-h-0 flex-col">
            {selectedBoard ? (
              detailLoading ? (
                <LoadingState variant="page" />
              ) : detailError || !detail ? (
                <div className="flex flex-1 items-center justify-center">
                  <ErrorState onRetry={handleDetailRetry} />
                </div>
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
              <div className="flex flex-1 items-center justify-center">
                <EmptyState
                  illustration={<EmptyUploadIllustration />}
                  title="Select a board"
                  description="Choose a board from the list to start editing."
                  compact
                />
              </div>
            )}
          </div>
        </div>
      )}

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
