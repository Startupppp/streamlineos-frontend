"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { type DropResult } from "@hello-pangea/dnd";
import { useUpdateTicket, useRankTicket } from "@/hooks/api/build/tickets";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import {
  type Ticket,
  type ListSelection,
  type ReorderContext,
  isReorderContext,
  DROPPABLE_MODES,
  LIST_RENDER_PAGE_SIZE,
  getGroupKey,
  buildGroupFieldPatch,
  applyLocalPatch,
  useItemSelectHandler,
} from "./list-view-shared";
import { compareByRank, computeOptimisticRank } from "./kanban-board-utils";

interface UseListViewParams {
  tickets: Ticket[];
  groupBy?: string;
  rowBy?: string;
  projectId?: number;
  showEmptyRows?: boolean;
  selection?: ListSelection;
}

export function useListView({
  tickets,
  groupBy,
  rowBy,
  projectId,
  showEmptyRows,
  selection,
}: UseListViewParams) {
  const hasRowBy = !!rowBy && rowBy !== "none";
  const shouldReduceMotion = useReducedMotion();
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const queryClient = useQueryClient();

  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [visibleFlatCount, setVisibleFlatCount] = useState(
    LIST_RENDER_PAGE_SIZE,
  );
  const prevTicketsRef = useRef(tickets);

  if (prevTicketsRef.current !== tickets) {
    prevTicketsRef.current = tickets;
    setOptimisticTickets(tickets);
    setVisibleFlatCount(LIST_RENDER_PAGE_SIZE);
  }

  const handleShowMoreFlat = useCallback(() => {
    setVisibleFlatCount((count) => count + LIST_RENDER_PAGE_SIZE);
  }, []);

  const handleItemSelect = useItemSelectHandler(selection);

  const isDnDMode =
    canUpdate &&
    (groupBy !== "assignee" || canAssign) &&
    !hasRowBy &&
    !!groupBy &&
    groupBy !== "none" &&
    DROPPABLE_MODES.has(groupBy) &&
    projectId != null;

  const updateTicket = useUpdateTicket(projectId ?? 0);
  const rankTicket = useRankTicket<ReorderContext>({
    onMutate: async (): Promise<ReorderContext> => {
      if (projectId == null) return { previousTickets: optimisticTickets };
      await queryClient.cancelQueries({
        queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
      });
      return { previousTickets: optimisticTickets };
    },
    onError: (error, _vars, context) => {
      if (isReorderContext(context))
        setOptimisticTickets(context.previousTickets);
      toast.error(getErrorMessage(error));
    },
    onSuccess: (data) => {
      if (data) {
        setOptimisticTickets((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, rank: data.rank } : t)),
        );
      }
    },
  });

  const grouped = useMemo(() => {
    if (!groupBy || groupBy === "none")
      return { "All Items": optimisticTickets };
    return optimisticTickets.reduce<Record<string, Ticket[]>>((acc, t) => {
      const key = getGroupKey(t, groupBy);
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
  }, [optimisticTickets, groupBy]);

  const nested = useMemo(() => {
    if (!hasRowBy) return null;
    const outerGrouped = optimisticTickets.reduce<Record<string, Ticket[]>>(
      (acc, t) => {
        const key = getGroupKey(t, rowBy ?? "");
        (acc[key] ??= []).push(t);
        return acc;
      },
      {},
    );
    const result: Record<string, Record<string, Ticket[]>> = {};
    for (const [outerKey, outerTickets] of Object.entries(outerGrouped)) {
      result[outerKey] = {};
      if (!groupBy || groupBy === "none") {
        result[outerKey]["All Items"] = outerTickets;
      } else {
        for (const t of outerTickets) {
          const innerKey = getGroupKey(t, groupBy);
          (result[outerKey][innerKey] ??= []).push(t);
        }
      }
    }
    return result;
  }, [optimisticTickets, groupBy, rowBy, hasRowBy]);

  const visibleOuterKeys = useMemo(() => {
    if (!nested) return [];
    return Object.entries(nested)
      .filter(
        ([, innerGroups]) =>
          showEmptyRows || Object.values(innerGroups).flat().length > 0,
      )
      .map(([outerKey]) => outerKey);
  }, [nested, showEmptyRows]);

  const flatGroupKeys = useMemo(() => Object.keys(grouped), [grouped]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;
      if (!groupBy || projectId == null) return;

      const ticketId = parseInt(draggableId, 10);
      const srcGroup = source.droppableId;
      const dstGroup = destination.droppableId;
      const isCrossGroup = srcGroup !== dstGroup;

      const allTickets = [...optimisticTickets];

      if (isCrossGroup) {
        const patch = buildGroupFieldPatch(
          groupBy,
          dstGroup,
          allTickets,
          ticketId,
        );
        if (!patch) return;
        const version = allTickets.find((t) => t.id === ticketId)?.version;
        if (version == null) return;

        const nextTickets = allTickets.map((t) =>
          t.id === ticketId ? applyLocalPatch(t, patch, groupBy) : t,
        );
        setOptimisticTickets(nextTickets);

        updateTicket.mutate(
          { ticketId, version, ...patch },
          {
            onError: () => setOptimisticTickets(allTickets),
          },
        );
      } else {
        const groupTickets = (grouped[srcGroup] ?? [])
          .slice()
          .sort(compareByRank);
        const [moved] = groupTickets.splice(source.index, 1);
        if (!moved) return;

        const beforeId = groupTickets[destination.index - 1]?.id ?? null;
        const afterId = groupTickets[destination.index]?.id ?? null;

        const optimisticRank = computeOptimisticRank(
          groupTickets.find((t) => t.id === beforeId)?.rank ?? null,
          groupTickets.find((t) => t.id === afterId)?.rank ?? null,
        );

        setOptimisticTickets(
          allTickets.map((t) =>
            t.id === moved.id ? { ...t, rank: optimisticRank } : t,
          ),
        );

        rankTicket.mutate({
          projectId,
          ticketId: moved.id,
          version: moved.version,
          beforeTicketId: beforeId,
          afterTicketId: afterId,
        });
      }
    },
    [groupBy, projectId, optimisticTickets, grouped, updateTicket, rankTicket],
  );

  return {
    hasRowBy,
    shouldReduceMotion,
    isDnDMode,
    hasFlatGrouping: !!groupBy && groupBy !== "none",
    optimisticTickets,
    grouped,
    nested,
    visibleOuterKeys,
    flatGroupKeys,
    handleDragEnd,
    handleShowMoreFlat,
    handleItemSelect,
    visibleFlatCount,
  };
}
