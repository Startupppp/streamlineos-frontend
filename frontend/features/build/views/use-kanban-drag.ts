"use client";

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { useUpdateTicketOrder, useReorderCustomStates } from "@/hooks/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryClient } from "@tanstack/react-query";
import type { DropResult } from "@hello-pangea/dnd";
import type { KanbanTicket, KanbanColumn } from "../shared/types";
import { isCompletedTicketStatus } from "../shared/completed-status";
import {
  type StatusEntry,
  type UpdateOrderContext,
  COLUMN_DND_TYPE,
  isUpdateOrderContext,
  decodeRowKey,
} from "./kanban-board-utils";

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
  const boardTicketsKey = queryKeys.projects.tickets({ projectId, view: "board" });
  const reorderStates = useReorderCustomStates(projectId);

  const updateOrder = useUpdateTicketOrder({
    onMutate: async (variables): Promise<UpdateOrderContext> => {
      await queryClient.cancelQueries({ queryKey: boardTicketsKey });
      const previousCache = queryClient.getQueryData<KanbanTicket[]>(boardTicketsKey);
      const byId = new Map(variables.items.map((item) => [item.id, item]));
      queryClient.setQueryData<KanbanTicket[]>(boardTicketsKey, (old) => {
        if (!old) return old;
        return old.map((ticket) => {
          const next = byId.get(ticket.id);
          return next
            ? { ...ticket, status: next.status, order: next.order }
            : ticket;
        });
      });
      return { previous: optimisticTickets, previousCache };
    },
    onError: (error, __, context) => {
      if (isUpdateOrderContext(context)) {
        setOptimisticTickets(context.previous);
        queryClient.setQueryData(boardTicketsKey, context.previousCache);
      }
      toast.error(getErrorMessage(error));
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

      const newTickets = [...optimisticTickets];
      const movedTicket = { ...sourceTicket, status: newStatus };

      const sourceTickets = newTickets
        .filter((t) => t.status === srcColId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const destTickets =
        srcColId === newStatus
          ? sourceTickets
          : newTickets
              .filter((t) => t.status === newStatus)
              .sort((a, b) => (a.order || 0) - (b.order || 0));

      const updates: { id: number; status: string; order: number }[] = [];

      if (srcColId === newStatus) {
        const items = Array.from(sourceTickets);
        const [reorderedItem] = items.splice(source.index, 1);
        if (!reorderedItem) return;
        items.splice(destination.index, 0, reorderedItem);
        items.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          if (tIndex === -1) return;
          newTickets[tIndex] = { ...newTickets[tIndex], order: index };
          updates.push({ id: ticket.id, status: ticket.status, order: index });
        });
      } else {
        const sourceItems = Array.from(sourceTickets);
        sourceItems.splice(source.index, 1);
        const destItems = Array.from(destTickets);
        destItems.splice(destination.index, 0, movedTicket);
        destItems.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          if (tIndex === -1) return;
          newTickets[tIndex] = {
            ...newTickets[tIndex],
            status: newStatus,
            order: index,
          };
          updates.push({ id: ticket.id, status: newStatus, order: index });
        });
        sourceItems.forEach((ticket, index) => {
          const tIndex = newTickets.findIndex((t) => t.id === ticket.id);
          if (tIndex === -1) return;
          newTickets[tIndex] = { ...newTickets[tIndex], order: index };
          updates.push({
            id: ticket.id,
            status: ticket.status,
            order: index,
          });
        });
      }

      setOptimisticTickets(newTickets);
      updateOrder.mutate({ projectId, items: updates });
    },
    [
      optimisticTickets,
      updateOrder,
      projectId,
      rowBy,
      hideCompleted,
      optimisticStatuses,
      handleColumnDragEnd,
    ],
  );

  return { onDragStart, onDragEnd };
}
