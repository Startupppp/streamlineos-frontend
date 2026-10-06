"use client";

import { memo } from "react";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DragDropContext,
} from "@hello-pangea/dnd";
import {
  type ListViewProps,
  LIST_RENDER_PAGE_SIZE,
  getGroupStatus,
  encodeNestedAccordionValue,
} from "./list-view-shared";
import { ListViewItem } from "./list-view-item";
import { InlineGroupCreate } from "./list-view-group-create";
import { GroupRows } from "./list-view-group-rows";
import { OuterGroupHeader, NestedGroup, DroppableGroup, formatGroupLabel } from "./list-view-group";
import { EmptyState } from "@/components/ui/empty-state";
import { useListView } from "./use-list-view";

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
  focusedTicketId,
  itemLayout = "standard",
}: ListViewProps) {
  const {
    hasRowBy,
    shouldReduceMotion,
    isDnDMode,
    hasFlatGrouping,
    optimisticTickets,
    grouped,
    nested,
    visibleOuterKeys,
    flatGroupKeys,
    handleDragEnd,
    handleShowMoreFlat,
    handleItemSelect,
    visibleFlatCount,
  } = useListView({ tickets, groupBy, rowBy, projectId, showEmptyRows, selection });

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
                          focusedTicketId={focusedTicketId}
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
          <EmptyState
            illustrationPreset="ticket"
            title="No work items"
            description="Tickets in this view will show up here."
            className="min-h-full w-full flex-1"
          />
        )}
      </div>
    );
  }

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
                    <span className="text-sm font-medium text-foreground">{formatGroupLabel(group)}</span>
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
                    focusedTicketId={focusedTicketId}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {optimisticTickets.length === 0 && (
            <EmptyState
              illustrationPreset="ticket"
              title="No work items"
              description="Tickets in this view will show up here."
              className="min-h-full w-full flex-1"
            />
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
                  <span className="text-sm font-medium text-foreground">{formatGroupLabel(group)}</span>
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
                  focusedTicketId={focusedTicketId}
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
                isKeyboardFocused={focusedTicketId === ticket.id}
                layout={itemLayout}
              />
            ))}
          </div>
          <InfiniteScrollSentinel
            hasNextPage={optimisticTickets.length > visibleFlatCount}
            isFetchingNextPage={false}
            onLoadMore={handleShowMoreFlat}
            label={`Show ${Math.min(LIST_RENDER_PAGE_SIZE, Math.max(0, optimisticTickets.length - visibleFlatCount))} more rows`}
          />
        </div>
      )}
      {tickets.length === 0 && (
        <EmptyState
          illustrationPreset="ticket"
          title="No work items"
          description="Tickets in this view will show up here."
          className="min-h-full w-full flex-1"
        />
      )}
    </div>
  );
});
