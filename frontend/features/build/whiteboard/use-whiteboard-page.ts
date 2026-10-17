"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
import { computeStoredVersion, isExcalidrawScene } from "./scene-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useWhiteboardAutosave } from "./use-whiteboard-autosave";

const BOARDS_COLLAPSED_KEY = "streamlineos:whiteboard:boards-collapsed";

interface UseWhiteboardPageParams {
  projectId: number;
  initialBoardId: number | null;
}

export function useWhiteboardPage({ projectId, initialBoardId }: UseWhiteboardPageParams) {
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

  const [chosenBoardId, setChosenBoardId] = useState<number | null>(initialBoardId);
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

  const handleToggleFullscreen = useCallback(() => setIsFullscreen((prev) => !prev), []);
  const handleExitFullscreen = useCallback(() => setIsFullscreen(false), []);
  const handleOpenShare = useCallback(() => setShareOpen(true), []);
  const handleShareOpenChange = useCallback((open: boolean) => setShareOpen(open), []);
  const handleDetailRetry = useCallback(() => refetchDetail(), [refetchDetail]);
  const handleBoardSelect = useCallback((id: number) => setChosenBoardId(id), []);
  const handleBoardDelete = useCallback((board: WhiteboardSummary) => setDeleteTarget(board), []);
  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleCreateOpenChange = useCallback((open: boolean) => setCreateOpen(open), []);
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
      onError: (e) => toast.error(getErrorMessage(e)),
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
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  return {
    canManage,
    boards,
    pageState,
    selectedBoard,
    detail,
    detailLoading,
    detailError,
    saveStatus,
    handleSceneChange,
    manualSave,
    isFullscreen,
    shareOpen,
    listCollapsed,
    createOpen,
    deleteTarget,
    hasNextPage,
    isFetchingNextPage,
    isCreatePending: createBoard.isPending,
    isDeletePending: deleteBoard.isPending,
    handleLoadMoreBoards,
    handleToggleFullscreen,
    handleExitFullscreen,
    handleOpenShare,
    handleShareOpenChange,
    handleDetailRetry,
    handleBoardSelect,
    handleBoardDelete,
    handleDeleteDialogOpenChange,
    handleOpenCreate,
    handleCreateOpenChange,
    handleRefetch,
    handleToggleList,
    handleCreate,
    handleConfirmDelete,
  };
}
