"use client";

import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCrmOptions } from "@/hooks/api/crm";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
import type { BoardLead } from "./leads-types";
import { KanbanCard } from "./kanban-card";

const FALLBACK_OPTIONS = [
  { key: "NEW", label: "New", color: "blue", isTerminal: false },
  { key: "CONTACTED", label: "Contacted", color: "sky", isTerminal: false },
  { key: "INTERESTED", label: "Interested", color: "amber", isTerminal: false },
  { key: "QUALIFIED", label: "Qualified", color: "blue", isTerminal: false },
  { key: "CONVERTED", label: "Converted", color: "emerald", isTerminal: true },
  { key: "LOST", label: "Lost", color: "red", isTerminal: true },
] as const;

interface LeadsKanbanProps {
  filteredBoard: Record<string, BoardLead[]> | null;
  onDragEnd: (result: DropResult) => void;
  onOpenLead: (id: number) => void;
  onMoveStatus: (leadId: number, status: string, expectedStatus?: string) => void;
}

export function LeadsKanban({ filteredBoard, onDragEnd, onOpenLead, onMoveStatus }: LeadsKanbanProps) {
  const { data: metaOptions = [] } = useCrmOptions("lead_status");
  const columns = metaOptions.length > 0 ? metaOptions : FALLBACK_OPTIONS;

  return (
    <div className="pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {columns.map((option) => {
            const { dotClass, badgeClass } = getCrmTokenClasses(option.color);
            const columnLeads: BoardLead[] = filteredBoard?.[option.key] ?? [];

            return (
              <div key={option.key} className="min-w-0">
                <div className={cn(
                  "rounded-lg border h-full flex flex-col border-border bg-muted/20",
                  option.isTerminal && "opacity-80",
                )}>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-t-lg border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full shrink-0", dotClass)} />
                      <h3 className={cn(
                        "text-sm font-semibold",
                        option.isTerminal ? "text-muted-foreground" : "text-foreground",
                      )}>
                        {option.label}
                      </h3>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs tabular-nums h-5 min-w-[20px] flex items-center justify-center",
                        badgeClass,
                      )}
                    >
                      {columnLeads.length}
                    </Badge>
                  </div>

                  <Droppable droppableId={option.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100dvh-380px)] overflow-y-auto transition-colors duration-200",
                          snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-inset ring-primary/20 rounded-b-xl",
                        )}
                      >
                        {columnLeads.map((lead: BoardLead, index: number) => (
                          <KanbanCard
                            key={lead.id}
                            lead={lead}
                            index={index}
                            status={option.key}
                            allStatusKeys={columns.map((c) => c.key)}
                            onOpen={onOpenLead}
                            onMoveStatus={onMoveStatus}
                          />
                        ))}
                        {provided.placeholder}

                        {columnLeads.length === 0 && !snapshot.isDraggingOver && (
                          <div className="text-center py-8 text-muted-foreground/40">
                            <p className="text-xs">No leads</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
