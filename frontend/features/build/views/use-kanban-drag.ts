"use client";

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useRankTicket } from "@/hooks/api/build/ticket-mutations";
import { useReorderCustomStates } from "@/hooks/api/build/custom-states";
import { patchTicketCollections, restoreTicketCollections, ticketRollback, type TicketSnapshots } from "@/hooks/api/build/ticket-cache";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryClient } from "@tanstack/react-query";
import type { DropResult } from "@hello-pangea/dnd";
import type { KanbanTicket, KanbanColumn } from "../shared/types";
import { isCompletedTicketStatus } from "../shared/completed-status";
import {
  type StatusEntry,
  COLUMN_DND_TYPE,
  decodeRowKey,
  compareByRank,
  computeOptimisticRank,
} from "./kanban-board-utils";

type RankDragContext = {
  previous: KanbanTicket[];
  optimistic: KanbanTicket[];
  previousCache: TicketSnapshots;
};

function isRankDragContext(v: unknown): v is RankDragContext {
  return typeof v === "object" && v !== null && "previous" in v;
}

interface KanbanDragParams {
  projectId: number;
  statuses: StatusEntry[] | undefined;
  rowBy: string;
  hideCompleted: boolean;
  canManage: boolean;
  visibleColumns: KanbanColumn[];
  orderedColumns: KanbanColumn[];
  optimisticTickets: KanbanTicket[];
  optimisticStatuses: StatusEntry[] | undefined;
  setOptimisticTickets: Dispatch<SetStateAction<KanbanTicket[]>>;
  setOptimisticStatuses: Dispatch<SetStateAction<StatusEntry[] | undefined>>;
  setOptimisticColumnOrder: Dispatch<SetStateAction<KanbanColumn[] | null>>;
  isDraggingRef: MutableRefObject<boolean>;
  dragStartRef: MutableRefObject<{ x: number; y: number } | null>;
}

export function useKanbanDrag({
  projectId,
  statuses,
  rowBy,
  hideCompleted,
  canManage,
  visibleColumns,
  orderedColumns,
  optimisticTickets,
  optimisticStatuses,
  setOptimisticTickets,
  setOptimisticStatuses,
  setOptimisticColumnOrder,
  isDraggingRef,
  dragStartRef,
}: KanbanDragParams) {
  const queryClient = useQueryClient();
  const boardTicketsKey = buildWorkQueryKeys.projects.tickets({ projectId });
  const reorderStates = useReorderCustomStates(projectId);

  const rankTicket = useRankTicket<RankDragContext>({
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: boardTicketsKey });
      const dragged = optimisticTickets.find((t) => t.id === variables.ticketId);
      const effectiveStatus = variables.status ?? dragged?.status ?? "";

      const destColTickets = optimisticTickets
        .filter((t) => t.status === effectiveStatus && t.id !== variables.ticketId)
        .sort(compareByRank);

      const beforeNeighbor = variables.beforeTicketId != null
        ? destColTickets.find((t) => t.id === variables.beforeTicketId)
        : null;
      const afterNeighbor = variables.afterTicketId != null
        ? destColTickets.find((t) => t.id === variables.afterTicketId)
        : null;

      const optimisticRank = computeOptimisticRank(
        beforeNeighbor?.rank ?? null,
        afterNeighbor?.rank ?? null,
      );

      const previousCache = patchTicketCollections(queryClient, projectId, (t) =>
        t.id === variables.ticketId
          ? { ...t, status: effectiveStatus, rank: optimisticRank }
          : t,
      );
      const optimistic = optimisticTickets.map((ticket) => ticket.id === variables.ticketId
        ? { ...ticket, status: effectiveStatus, rank: optimisticRank } : ticket);
      setOptimisticTickets((current) => current.map((ticket) => ticket.id === variables.ticketId
        ? { ...ticket, status: effectiveStatus, rank: optimisticRank } : ticket));
      return { previous: optimisticTickets, optimistic, previousCache };
    },
    onError: (error, _vars, context) => {
      if (isRankDragContext(context)) {
        const restore = ticketRollback(context.previous, context.optimistic);
        setOptimisticTickets((current) => current.map(restore));
        restoreTicketCollections(queryClient, context.previousCache);
      }
      toast.error(getErrorMessage(error));
    },
    onSettled: (data) => {
      if (data) {
        patchTicketCollections(queryClient, projectId, (t) =>
          t.id === data.id ? { ...t, rank: data.rank, status: data.status } : t,
        );
      }
      queryClient.invalidateQueries({ queryKey: boardTicketsKey });
    },
  });

  const handleColumnDragEnd = useCallback(
    (result: DropResult) => {
      if (!canManage) return;
      const { destination, source } = result;
      if (!destination) return;
      if (destination.index === source.index) return;

      const reorderedVisible = Array.from(visibleColumns);
      const [moved] = reorderedVisible.splice(source.index, 1);
      if (!moved?.statusId) return;
      reorderedVisible.splice(destination.index, 0, moved);

      const visibleIds = new Set(reorderedVisible.map((col) => col.id));
      const hiddenColumns = orderedColumns.filter((col) => !visibleIds.has(col.id));
      const mergedOrder = [...reorderedVisible, ...hiddenColumns];

      let configuredOrder = 0;
      const nextColumnOrder = mergedOrder.map((col) => {
        if (col.statusId == null) return col;
        const next = { ...col, order: configuredOrder };
        configuredOrder += 1;
        return next;
      });

      setOptimisticColumnOrder(nextColumnOrder);
      setOptimisticStatuses((prev) =>
        prev?.map((status) => {
          const next = nextColumnOrder.find((col) => col.statusId === status.id);
          return next ? { ...status, order: next.order } : status;
        }),
      );

      reorderStates.mutate(
        nextColumnOrder.flatMap((col) =>
          col.statusId != null
            ? [{ stateId: col.statusId, order: col.order }]
            : [],
        ),
        {
          onError: (error) => {
            setOptimisticColumnOrder(null);
            setOptimisticStatuses(statuses);
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [canManage, visibleColumns, orderedColumns, reorderStates, statuses],
  );

  const onDragStart = useCallback(() => {
    isDraggingRef.current = true;
    dragStartRef.current = null;
  }, []);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      isDraggingRef.current = false;
      dragStartRef.current = null;
      if (result.type === COLUMN_DND_TYPE) {
        handleColumnDragEnd(result);
        return;
      }

      const { destination, source, draggableId } = result;
      if (!destination) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      if (rowBy !== "none") {
        const srcRow = decodeRowKey(source.droppableId.split("||")[0] ?? "");
        const dstRow = decodeRowKey(destination.droppableId.split("||")[0] ?? "");
        if (srcRow !== dstRow) {
          toast.error("Cannot move across rows — reassign the ticket directly.");
          return;
        }
      }

      const ticketId = Number.parseInt(draggableId, 10);
      if (!Number.isFinite(ticketId)) return;

      const newStatus =
        rowBy !== "none"
          ? (destination.droppableId.split("||")[1] ?? destination.droppableId)
          : destination.droppableId;

      if (hideCompleted && isCompletedTicketStatus(newStatus, optimisticStatuses)) {
        toast.error("Turn off Hide done to move tickets into a completed column.");
        return;
      }

      const srcColId =
        rowBy !== "none"
          ? (source.droppableId.split("||")[1] ?? source.droppableId)
          : source.droppableId;

      const sourceTicket = optimisticTickets.find((t) => t.id === ticketId);
      if (!sourceTicket) return;

      const isCrossColumn = srcColId !== newStatus;

      const destColTickets = optimisticTickets
        .filter((t) => t.status === newStatus && t.id !== ticketId)
        .sort(compareByRank);

      const beforeTicketId = destColTickets[destination.index - 1]?.id ?? null;
      const afterTicketId = destColTickets[destination.index]?.id ?? null;

      rankTicket.mutate({
        projectId,
        ticketId,
        beforeTicketId,
        afterTicketId,
        ...(isCrossColumn ? { status: newStatus } : {}),
      });
    },
    [
      optimisticTickets,
      rankTicket,
      projectId,
      rowBy,
      hideCompleted,
      optimisticStatuses,
      handleColumnDragEnd,
    ],
  );

  return { onDragStart, onDragEnd };
}
