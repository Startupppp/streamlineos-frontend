"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn, resolveImageUrl } from "@/lib/utils";
import { User } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { getUserInitials } from "@/lib/person-display";
import { pmSnappy } from "@/lib/motion-presets";
import { getGroupStatus, useItemSelectHandler } from "./list-view-shared";
import type { OuterGroupHeaderProps, NestedGroupProps, DroppableGroupProps } from "./list-view-shared";
import { ListViewItem } from "./list-view-item";
import { InlineGroupCreate } from "./list-view-group-create";
import {
  GroupRows,
  ShowMoreRowsButton,
  useGroupRenderLimit,
} from "./list-view-group-rows";

export function OuterGroupHeader({ groupKey, rowBy, tickets, count }: OuterGroupHeaderProps) {
  if (rowBy === "assignee") {
    const assigneeTicket = tickets.find((t) => t.assignee != null);
    const assignee = assigneeTicket?.assignee ?? null;
    return (
      <div className="flex items-center gap-2">
        {assignee ? (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={resolveImageUrl(assignee.image)} />
            <AvatarFallback className="text-micro">{getUserInitials(assignee)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-6 w-6 flex-shrink-0 rounded-full bg-muted flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm font-semibold text-foreground">{groupKey}</span>
        <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-foreground">{groupKey}</span>
      <span className="text-xs text-muted-foreground tabular-nums">({count})</span>
    </div>
  );
}

export function NestedGroup({
  accordionValue,
  groupKey,
  outerGroupKey,
  items,
  groupBy,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
  selection,
}: NestedGroupProps) {
  const status = getGroupStatus(groupBy, groupKey, items);
  return (
    <AccordionItem value={accordionValue} className="mb-3 border-b-0">
      <div className="mb-1.5 flex items-center gap-2 pl-1">
        <AccordionTrigger className="flex flex-1 items-center gap-2 py-0 hover:no-underline font-normal [&>svg]:ml-auto [&>svg]:size-3.5">
          <span className="text-xs font-medium text-muted-foreground">{groupKey}</span>
          <span className="text-xs text-muted-foreground tabular-nums">({items.length})</span>
        </AccordionTrigger>
        {projectId && (
          <InlineGroupCreate
            groupKey={`${outerGroupKey}/${groupKey}`}
            projectId={projectId}
            status={status}
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
  );
}

export function DroppableGroup({
  groupKey,
  items,
  projectKey,
  projectId,
  projectStatuses,
  displayOptions,
  onTicketClick,
  shouldReduceMotion,
  selection,
}: DroppableGroupProps) {
  const { visibleCount, hiddenCount, showMore } = useGroupRenderLimit(
    items.length,
  );
  const visibleItems = items.slice(0, visibleCount);

  const handleItemSelect = useItemSelectHandler(selection);

  return (
    <Droppable droppableId={groupKey} type="LIST_TICKET">
      {(provided, snapshot) => (
        <motion.div
          ref={provided.innerRef}
          {...provided.droppableProps}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  backgroundColor: snapshot.isDraggingOver
                    ? "color-mix(in srgb, var(--primary) 7%, transparent)"
                    : "transparent",
                }
          }
          transition={pmSnappy}
          className={cn(
            "overflow-hidden rounded-lg border border-border bg-card shadow-sm divide-y divide-border min-h-[40px]",
            snapshot.isDraggingOver && "ring-1 ring-inset ring-primary/20",
          )}
        >
          {visibleItems.map((ticket, index) => (
            <Draggable key={ticket.id} draggableId={String(ticket.id)} index={index}>
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  style={dragProvided.draggableProps.style}
                >
                  <ListViewItem
                    ticket={ticket}
                    projectKey={projectKey}
                    projectId={projectId}
                    projectStatuses={projectStatuses}
                    onClick={onTicketClick}
                    displayOptions={displayOptions}
                    dragHandleProps={dragProvided.dragHandleProps}
                    isDragging={dragSnapshot.isDragging}
                    isSelected={selection?.selected.has(ticket.id)}
                    onSelect={selection ? handleItemSelect : undefined}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
          {hiddenCount > 0 && (
            <ShowMoreRowsButton
              visibleCount={visibleCount}
              total={items.length}
              onShowMore={showMore}
            />
          )}
          {items.length === 0 && !snapshot.isDraggingOver && (
            <div className="py-4 text-center text-xs text-muted-foreground">Drop tickets here</div>
          )}
        </motion.div>
      )}
    </Droppable>
  );
}
