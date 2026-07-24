"use client";

import { memo, useCallback, useMemo, type CSSProperties, type MutableRefObject } from "react";
import {
  Droppable,
  Draggable,
  type DraggableProvided,
  type DraggableRubric,
  type DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { cn } from "@/lib/utils";
import { KanbanTicketCard } from "./kanban-ticket-card";
import type { KanbanTicket, DisplayOptions } from "../shared/types";

export const TICKET_DND_TYPE = "TICKET";

const DEFAULT_ROW_HEIGHT = 118;
const ROW_GAP_PX = 6;
const OVERSCAN_COUNT = 6;

interface KanbanVirtualRowData {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  dragStartRef: MutableRefObject<{ x: number; y: number } | null>;
  onSelect: (id: number) => void;
  displayOptions?: DisplayOptions;
}

function mergeRowStyle(
  windowStyle: CSSProperties,
  draggableStyle: CSSProperties | undefined,
): CSSProperties {
  return {
    ...draggableStyle,
    ...windowStyle,
    paddingBottom: ROW_GAP_PX,
    boxSizing: "border-box",
  };
}

function KanbanVirtualRow({
  ariaAttributes,
  index,
  style,
  tickets,
  projectId,
  projectKey,
  dragStartRef,
  onSelect,
  displayOptions,
}: RowComponentProps<KanbanVirtualRowData>) {
  const ticket = tickets[index];
  if (!ticket) {
    return <div style={style} />;
  }

  return (
    <Draggable draggableId={String(ticket.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          {...ariaAttributes}
          style={mergeRowStyle(style, provided.draggableProps.style)}
          className={cn(snapshot.isDragging && "z-20")}
        >
          <KanbanTicketCard
            ticket={ticket}
            projectId={projectId}
            projectKey={projectKey}
            isDragging={snapshot.isDragging}
            dragStartRef={dragStartRef}
            onSelect={onSelect}
            displayOptions={displayOptions}
          />
        </div>
      )}
    </Draggable>
  );
}

function getRowKey(index: number, data: KanbanVirtualRowData): string | number {
  return data.tickets[index]?.id ?? `placeholder-${index}`;
}

interface KanbanVirtualTicketListProps {
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  droppableId: string;
  displayOptions?: DisplayOptions;
  stretch?: boolean;
  minHeightClass?: string;
  onSelect: (id: number) => void;
  dragStartRef: MutableRefObject<{ x: number; y: number } | null>;
}

export const KanbanVirtualTicketList = memo(function KanbanVirtualTicketList({
  tickets,
  projectId,
  projectKey,
  droppableId,
  displayOptions,
  stretch = true,
  minHeightClass = "min-h-[100px]",
  onSelect,
  dragStartRef,
}: KanbanVirtualTicketListProps) {
  const heightKey = useMemo(() => tickets.map((ticket) => ticket.id).join("-"), [tickets]);
  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    key: heightKey,
  });

  const rowProps = useMemo(
    () => ({
      tickets,
      projectId,
      projectKey,
      dragStartRef,
      onSelect,
      displayOptions,
    }),
    [tickets, projectId, projectKey, dragStartRef, onSelect, displayOptions],
  );

  const renderClone = useCallback(
    (
      provided: DraggableProvided,
      snapshot: DraggableStateSnapshot,
      rubric: DraggableRubric,
    ) => {
      const ticket = tickets[rubric.source.index];
      if (!ticket) return null;
      return (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style}
          className="z-20"
        >
          <KanbanTicketCard
            ticket={ticket}
            projectId={projectId}
            projectKey={projectKey}
            isDragging={snapshot.isDragging}
            dragStartRef={dragStartRef}
            onSelect={onSelect}
            displayOptions={displayOptions}
          />
        </div>
      );
    },
    [tickets, projectId, projectKey, dragStartRef, onSelect, displayOptions],
  );

  return (
    <Droppable
      droppableId={droppableId}
      type={TICKET_DND_TYPE}
      mode="virtual"
      renderClone={renderClone}
    >
      {(provided, snapshot) => {
        const rowCount = snapshot.isUsingPlaceholder ? tickets.length + 1 : tickets.length;

        return (
          <List<KanbanVirtualRowData>
            {...provided.droppableProps}
            listRef={(api) => {
              provided.innerRef(api?.element ?? null);
            }}
            className={cn(
              "scrollbar-hide rounded-b-lg px-2 pb-2",
              stretch ? "min-h-0" : "",
              minHeightClass,
              "transition-[background-color,box-shadow] duration-150 ease-out",
              snapshot.isDraggingOver && "bg-primary/[0.07] ring-1 ring-inset ring-primary/15",
            )}
            style={{ height: "100%" }}
            defaultHeight={320}
            rowCount={rowCount}
            rowHeight={rowHeight}
            rowComponent={KanbanVirtualRow}
            rowProps={rowProps}
            rowKey={getRowKey}
            overscanCount={OVERSCAN_COUNT}
          />
        );
      }}
    </Droppable>
  );
});
