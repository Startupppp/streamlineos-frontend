"use client";

import { memo, type MutableRefObject } from "react";
import {
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
} from "@hello-pangea/dnd";
import { FileText, CircleCheck, CirclePlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { QuickAddInput } from "./kanban-quick-add";
import { KanbanColumnHeader } from "./kanban-column-header";
import { resolveWipState } from "./kanban-board-utils";
import type { ListSelection } from "./list-view-shared";
import {
  KanbanVirtualTicketList,
  TICKET_DND_TYPE,
} from "./kanban-virtual-ticket-list";
import type { KanbanTicket, KanbanColumn, DisplayOptions } from "../shared/types";

export interface KanbanBoardColumnProps {
  column: KanbanColumn;
  tickets: KanbanTicket[];
  projectId: number;
  projectKey?: string;
  droppableId: string;
  canManage: boolean;
  existingNames: string[];
  wipLimit?: number;
  serverCount?: number;
  displayOptions?: DisplayOptions;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  isColumnDragging?: boolean;
  showHeaderQuickAdd?: boolean;
  stretch?: boolean;
  minHeightClass?: string;
  onRename: (oldName: string, newName: string) => void;
  onColorChange: (statusId: number, color: string) => void;
  onSelect: (id: number) => void;
  selection?: ListSelection;
  dragStartRef: MutableRefObject<{ x: number; y: number } | null>;
  canDragTickets: boolean;
  columnInnerRef?: (element?: HTMLElement | null) => void;
  columnDraggableProps?: DraggableProvidedDraggableProps;
}

export const KanbanBoardColumn = memo(function KanbanBoardColumn({
  column,
  tickets,
  projectId,
  projectKey,
  droppableId,
  canManage,
  existingNames,
  wipLimit,
  serverCount,
  displayOptions,
  dragHandleProps,
  isColumnDragging = false,
  showHeaderQuickAdd = false,
  stretch = true,
  minHeightClass = "min-h-[100px]",
  onRename,
  onColorChange,
  onSelect,
  selection,
  dragStartRef,
  canDragTickets,
  columnInnerRef,
  columnDraggableProps,
}: KanbanBoardColumnProps) {
  const wipCount = serverCount ?? tickets.length;
  const wipState = resolveWipState(wipCount, wipLimit);

  return (
    <div
      ref={columnInnerRef}
      {...columnDraggableProps}
      data-wip-state={wipState}
      className={cn(
        "flex min-h-0 w-72 min-w-[280px] shrink-0 flex-col self-stretch rounded-xl border border-border bg-muted/30",
        wipState === "at" && statusToneClasses("warning").rule,
        wipState === "over" && statusToneClasses("danger").rule,
        isColumnDragging && "opacity-95 shadow-lg ring-2 ring-primary/20",
      )}
    >
      <KanbanColumnHeader
        column={column}
        projectId={projectId}
        ticketCount={tickets.length}
        serverCount={serverCount}
        wipLimit={wipLimit}
        canManage={canManage}
        existingNames={existingNames}
        onRename={onRename}
        onColorChange={onColorChange}
        quickAdd={
          showHeaderQuickAdd ? (
            <QuickAddInput columnId={column.id} projectId={projectId} />
          ) : undefined
        }
        dragHandleProps={dragHandleProps}
      />

      {tickets.length === 0 ? (
        <Droppable droppableId={droppableId} type={TICKET_DND_TYPE}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                stretch ? "min-h-0 flex-1" : "",
                "space-y-1.5 overflow-y-auto rounded-b-lg px-2 pb-2 scrollbar-hide",
                minHeightClass,
                "transition-[background-color,box-shadow] duration-150 ease-out",
                snapshot.isDraggingOver && "bg-primary/[0.07] ring-1 ring-inset ring-primary/15",
              )}
            >
              {!snapshot.isDraggingOver ? (
                <ColumnEmptyState column={column} compact={minHeightClass === "min-h-[60px]"} />
              ) : null}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      ) : (
        <div className={cn(stretch ? "min-h-0 flex-1" : "", "flex flex-col")}>
          <KanbanVirtualTicketList
            tickets={tickets}
            projectId={projectId}
            projectKey={projectKey}
            droppableId={droppableId}
            displayOptions={displayOptions}
            stretch={stretch}
            minHeightClass={minHeightClass}
            onSelect={onSelect}
            selection={selection}
            dragStartRef={dragStartRef}
            canDragTickets={canDragTickets}
          />
        </div>
      )}
    </div>
  );
});

export function ColumnEmptyState({
  column,
  compact,
}: {
  column: KanbanColumn;
  compact: boolean;
}) {
  const kind = emptyColumnKind(column);
  const { Icon, title, hint } = EMPTY_COLUMN_COPY[kind];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-2 text-center",
        compact ? "py-4" : "py-8",
      )}
    >
      <Icon
        aria-hidden="true"
        data-testid="column-empty-icon"
        className="h-8 w-8 text-muted-foreground opacity-40"
      />
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-foreground">{title}</p>
        {compact ? null : (
          <p className="max-w-[12rem] text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}

const EMPTY_COLUMN_COPY = {
  progress: {
    Icon: CirclePlay,
    title: "Nothing in progress",
    hint: "Drop a ticket here when work begins.",
  },
  done: {
    Icon: CircleCheck,
    title: "Nothing done yet",
    hint: "Drop a ticket here when it ships.",
  },
  default: {
    Icon: FileText,
    title: "No tickets",
    hint: "Drop a ticket here to get started.",
  },
} as const;

function emptyColumnKind(column: KanbanColumn): keyof typeof EMPTY_COLUMN_COPY {
  const haystack = `${column.id} ${column.name}`.toLowerCase();
  if (haystack.includes("progress") || haystack.includes("doing")) return "progress";
  if (haystack.includes("done") || haystack.includes("complete")) return "done";
  return "default";
}
