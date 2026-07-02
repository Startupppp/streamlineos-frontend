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
import { Plus, Trash2, StickyNote } from "lucide-react";
import {
  useWhiteboards,
  useCreateWhiteboard,
  useDeleteWhiteboard,
  type WhiteboardSummary,
} from "@/hooks/api/projects";
import { toast } from "sonner";

const ExcalidrawCanvas = dynamic(
  () =>
    import("@/features/projects/whiteboard/excalidraw-canvas").then(
      (m) => m.ExcalidrawCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between pb-2 shrink-0">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
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
  onSelect: (id: number) => void;
  onDelete: (board: WhiteboardSummary) => void;
}

const BoardItem = memo(function BoardItem({
  board,
  isSelected,
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

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e) => e.key === "Enter" && handleSelect()}
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{board.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {board.elementCount} {board.elementCount === 1 ? "item" : "items"}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleDelete}
          aria-label="Delete board"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </li>
  );
});

export default function WhiteboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  const { data: boards, isLoading, isError, refetch } = useWhiteboards(projectId);
  const createBoard = useCreateWhiteboard(projectId);
  const deleteBoard = useDeleteWhiteboard(projectId);

  const [chosenBoardId, setChosenBoardId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhiteboardSummary | null>(null);

  const selectedBoard = useMemo(() => {
    if (!boards || boards.length === 0) return null;
    return boards.find((b) => b.id === chosenBoardId) ?? boards[0];
  }, [boards, chosenBoardId]);

  const handleBoardSelect = useCallback((id: number) => setChosenBoardId(id), []);
  const handleBoardDelete = useCallback((board: WhiteboardSummary) => setDeleteTarget(board), []);
  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRefetch = useCallback(() => refetch(), [refetch]);

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

  return (
    <PageWrapper
      title="Whiteboard"
      subtitle="Sketch ideas visually with your team"
      noInternalScroll
      contentClassName="flex min-h-0"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Board
        </Button>
      }
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
            action={{ label: "New Board", onClick: handleOpenCreate }}
            className="flex-1"
          />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 gap-3">
          {/* Board list sidebar */}
          <aside className="w-48 shrink-0 overflow-y-auto border-r border-border pr-3 hidden md:block">
            <ul className="space-y-0.5">
              {boards.map((board) => (
                <BoardItem
                  key={board.id}
                  board={board}
                  isSelected={board.id === (selectedBoard?.id ?? null)}
                  onSelect={handleBoardSelect}
                  onDelete={handleBoardDelete}
                />
              ))}
            </ul>
          </aside>

          {/* Mobile board selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-border shrink-0 md:hidden">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleBoardSelect(board.id)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                  board.id === (selectedBoard?.id ?? null)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {board.name}
              </button>
            ))}
          </div>

          {/* Canvas area */}
          <div className="flex flex-1 min-h-0 flex-col">
            {selectedBoard ? (
              <ExcalidrawCanvas
                key={selectedBoard.id}
                projectId={projectId}
                board={selectedBoard}
              />
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

      <CreateBoardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        isPending={createBoard.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={handleAlertOpenChange}>
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
