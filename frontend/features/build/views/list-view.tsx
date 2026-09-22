"use client";

import { useMemo, memo, useCallback, useState, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateTicket, useRankTicket } from "@/hooks/api";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  type Ticket,
  type ListViewProps,
  type ReorderContext,
  isReorderContext,
  DROPPABLE_MODES,
  LIST_RENDER_PAGE_SIZE,
  getGroupKey,
  getGroupStatus,
  encodeNestedAccordionValue,
  buildGroupFieldPatch,
  applyLocalPatch,
  useItemSelectHandler,
} from "./list-view-shared";
import { compareByRank, computeOptimisticRank } from "./kanban-board-utils";
import { ListViewItem } from "./list-view-item";
import { InlineGroupCreate } from "./list-view-group-create";
import { GroupRows } from "./list-view-group-rows";
import { OuterGroupHeader, NestedGroup, DroppableGroup } from "./list-view-group";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";

export const ListView = memo(function ListView({
  tickets,
  onTicketClick,
  groupBy,
  rowBy,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  showEmptyRows,
  selection,
}: ListViewProps) {
  const hasRowBy = !!rowBy && rowBy !== "none";
  const shouldReduceMotion = useReducedMotion();
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const queryClient = useQueryClient();
  const [optimisticTickets, setOptimisticTickets] = useState(tickets);
  const [visibleFlatCount, setVisibleFlatCount] = useState(LIST_RENDER_PAGE_SIZE);
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

  const isDnDMode = canUpdate && (groupBy !== "assignee" || canAssign) && !hasRowBy && !!groupBy && groupBy !== "none" && DROPPABLE_MODES.has(groupBy) && projectId != null;

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
      if (isReorderContext(context)) setOptimisticTickets(context.previousTickets);
      toast.error(getErrorMessage(error));
    },
    onSettled: (data) => {
      if (data) {
        setOptimisticTickets((prev) =>
          prev.map((t) => (t.id === data.id ? { ...t, rank: data.rank } : t)),
        );
      }
      if (projectId == null) return;
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.tickets({ projectId }),
      });
    },
  });

  const grouped = useMemo(() => {
    if (!groupBy || groupBy === "none") return { "All Items": optimisticTickets };
    return optimisticTickets.reduce<Record<string, Ticket[]>>((acc, t) => {
      const key = getGroupKey(t, groupBy);
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
  }, [optimisticTickets, groupBy]);

  const nested = useMemo(() => {
    if (!hasRowBy) return null;
    const outerGrouped = optimisticTickets.reduce<Record<string, Ticket[]>>((acc, t) => {
      const key = getGroupKey(t, rowBy ?? "");
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
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
      .filter(([, innerGroups]) => showEmptyRows || Object.values(innerGroups).flat().length > 0)
      .map(([outerKey]) => outerKey);
  }, [nested, showEmptyRows]);

  const flatGroupKeys = useMemo(() => Object.keys(grouped), [grouped]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;
      if (!groupBy || projectId == null) return;

      const ticketId = parseInt(draggableId, 10);
      const srcGroup = source.droppableId;
      const dstGroup = destination.droppableId;
      const isCrossGroup = srcGroup !== dstGroup;

      const allTickets = [...optimisticTickets];

      if (isCrossGroup) {
        const patch = buildGroupFieldPatch(groupBy, dstGroup, allTickets, ticketId);
        if (!patch) return;

        const nextTickets = allTickets.map((t) =>
          t.id === ticketId ? applyLocalPatch(t, patch, groupBy) : t,
        );
        setOptimisticTickets(nextTickets);

        updateTicket.mutate(
          { ticketId, ...patch },
          {
            onError: () => setOptimisticTickets(allTickets),
          },
        );
      } else {
        const groupTickets = (grouped[srcGroup] ?? []).slice().sort(compareByRank);
        const [moved] = groupTickets.splice(source.index, 1);
        if (!moved) return;

        const beforeId = groupTickets[destination.index - 1]?.id ?? null;
        const afterId = groupTickets[destination.index]?.id ?? null;

        const optimisticRank = computeOptimisticRank(
          groupTickets.find((t) => t.id === beforeId)?.rank ?? null,
          groupTickets.find((t) => t.id === afterId)?.rank ?? null,
        );

        setOptimisticTickets(
          allTickets.map((t) => (t.id === moved.id ? { ...t, rank: optimisticRank } : t)),
        );

        rankTicket.mutate({
          projectId,
          ticketId: moved.id,
          beforeTicketId: beforeId,
          afterTicketId: afterId,
        });
      }
    },
    [groupBy, projectId, optimisticTickets, grouped, updateTicket, rankTicket],
  );

  if (hasRowBy && nested) {
    return (
      <div className="flex flex-col gap-4">
        <Accordion
          type="multiple"
          defaultValue={visibleOuterKeys}
          className="flex flex-col gap-1.5"
        >
          {visibleOuterKeys.map((outerKey) => {
            const innerGroups = nested[outerKey];
            if (!innerGroups) return null;
            const outerTickets = Object.values(innerGroups).flat();
            const innerAccordionValues = Object.keys(innerGroups).map((innerKey) =>
              encodeNestedAccordionValue(outerKey, innerKey),
            );

            return (
              <AccordionItem key={outerKey} value={outerKey} className="border-b-0">
                <AccordionTrigger className="flex items-center gap-2 px-0 py-1 hover:no-underline font-normal [&>svg]:ml-auto">
                  <OuterGroupHeader
                    groupKey={outerKey}
                    rowBy={rowBy ?? ""}
                    tickets={outerTickets}
                    count={outerTickets.length}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="space-y-0 border-l border-border pl-3">
                    <Accordion
                      type="multiple"
                      defaultValue={innerAccordionValues}
                      className="flex flex-col"
                    >
                      {Object.entries(innerGroups).map(([innerKey, items]) => (
                        <NestedGroup
                          key={innerKey}
                          accordionValue={encodeNestedAccordionValue(outerKey, innerKey)}
                          groupKey={innerKey}
                          outerGroupKey={outerKey}
                          items={items}
                          groupBy={groupBy ?? "none"}
                          projectKey={projectKey}
                          projectId={projectId}
                          projectStatuses={projectStatuses}
                          displayOptions={displayOptions}
                          onTicketClick={onTicketClick}
                          selection={selection}
                        />
                      ))}
                    </Accordion>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        {tickets.length === 0 && (
          <EmptyState title="No work items" compact className="py-12" />
        )}
      </div>
    );
  }

  const hasFlatGrouping = !!groupBy && groupBy !== "none";

  if (isDnDMode) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-4">
          <Accordion
            type="multiple"
            defaultValue={flatGroupKeys}
            className="flex flex-col gap-1.5"
          >
            {Object.entries(grouped).map(([group, items]) => (
              <AccordionItem key={group} value={group} className="border-b-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <AccordionTrigger className="flex flex-1 items-center gap-2 py-0 hover:no-underline font-normal [&>svg]:ml-auto">
                    <span className="text-sm font-semibold text-foreground">{group}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">({items.length})</span>
                  </AccordionTrigger>
                  {projectId && (
                    <InlineGroupCreate
                      groupKey={group}
                      projectId={projectId}
                      status={getGroupStatus(groupBy ?? "status", group, items)}
                    />
                  )}
                </div>
                <AccordionContent className="pb-0">
                  <DroppableGroup
                    groupKey={group}
                    items={items}
                    projectKey={projectKey}
                    projectId={projectId}
                    projectStatuses={projectStatuses}
                    displayOptions={displayOptions}
                    onTicketClick={onTicketClick}
                    shouldReduceMotion={shouldReduceMotion}
                    selection={selection}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {optimisticTickets.length === 0 && (
            <EmptyState title="No work items" compact className="py-12" />
          )}
        </div>
      </DragDropContext>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {hasFlatGrouping ? (
        <Accordion
          type="multiple"
          defaultValue={flatGroupKeys}
          className="flex flex-col gap-1.5"
        >
          {Object.entries(grouped).map(([group, items]) => (
            <AccordionItem key={group} value={group} className="border-b-0">
              <div className="mb-1.5 flex items-center gap-2">
                <AccordionTrigger className="flex flex-1 items-center gap-2 py-0 hover:no-underline font-normal [&>svg]:ml-auto">
                  <span className="text-sm font-semibold text-foreground">{group}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">({items.length})</span>
                </AccordionTrigger>
                {projectId && (
                  <InlineGroupCreate
                    groupKey={group}
                    projectId={projectId}
                    status={getGroupStatus(groupBy ?? "status", group, items)}
                  />
                )}
              </div>
              <AccordionContent className="pb-0">
                <GroupRows
                  items={items}
                  projectKey={projectKey}
                  projectId={projectId}
                  projectStatuses={projectStatuses}
                  displayOptions={displayOptions}
                  onTicketClick={onTicketClick}
                  selection={selection}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border">
            {optimisticTickets.slice(0, visibleFlatCount).map((ticket) => (
              <ListViewItem
                key={ticket.id}
                ticket={ticket}
                projectKey={projectKey}
                projectId={projectId}
                projectStatuses={projectStatuses}
                onClick={onTicketClick}
                displayOptions={displayOptions}
                isSelected={selection?.selected.has(ticket.id)}
                onSelect={selection ? handleItemSelect : undefined}
              />
            ))}
          </div>
          {optimisticTickets.length > visibleFlatCount && (
            <button
              type="button"
              onClick={handleShowMoreFlat}
              className="mx-auto rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              Show {Math.min(LIST_RENDER_PAGE_SIZE, optimisticTickets.length - visibleFlatCount)} more
              <span className="ml-1 tabular-nums opacity-70">
                ({visibleFlatCount} of {optimisticTickets.length})
              </span>
            </button>
          )}
        </div>
      )}
      {tickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No work items found</div>
      )}
    </div>
  );
});
