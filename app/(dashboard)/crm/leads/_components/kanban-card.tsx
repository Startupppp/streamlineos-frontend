"use client";

import { Plus, ArrowRight, X, GripVertical, Building2 } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { useSelfAssignLead } from "@/lib/hooks/trpc-hooks";
import { STATUSES, SOURCE_COLORS, PRIORITY_CONFIG, timeAgo, getInitials } from "./leads-constants";
import type { BoardLead, LeadStatus } from "./leads-types";

interface KanbanCardProps {
  lead: BoardLead;
  index: number;
  status: LeadStatus;
  onOpen: (id: number) => void;
  onMoveStatus: (leadId: number, status: LeadStatus, expectedStatus?: LeadStatus) => void;
}

export function KanbanCard({ lead, index, status, onOpen, onMoveStatus }: KanbanCardProps) {
  const selfAssign = useSelfAssignLead();

  return (
    <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          className="group"
        >
          <Card
            className={cn(
              "cursor-pointer transition-all border-border/40",
              dragSnapshot.isDragging
                ? "shadow-xl ring-2 ring-gold/30 rotate-[2deg] scale-105"
                : "hover:shadow-md hover:border-gold/30"
            )}
            onClick={() => onOpen(lead.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                {/* Drag Handle */}
                <div
                  {...dragProvided.dragHandleProps}
                  className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    {lead.assignedTo ? (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={resolveImageUrl(lead.assignedTo.image)} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(lead.assignedTo.name ?? "")}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selfAssign.mutate({ leadId: lead.id }, {
                            onSuccess: () => toast.success("Lead assigned to you"),
                          });
                        }}
                        className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-gold/50 transition-colors"
                        aria-label="Self-assign this lead"
                      >
                        <Plus className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {lead.company && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {lead.company}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {lead.priority && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border font-semibold",
                        PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.WARM,
                      )}>
                        {lead.priority}
                      </span>
                    )}
                    {lead.source && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border",
                        SOURCE_COLORS[lead.source] || SOURCE_COLORS.other,
                      )}>
                        {lead.source.replace("_", " ")}
                      </span>
                    )}
                    {lead.potentialValue && Number(lead.potentialValue) > 0 && (
                      <span className="text-[10px] text-emerald-400 font-medium">
                        ₹{Number(lead.potentialValue).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground">
                      {lead.createdAt ? timeAgo(lead.createdAt) : "—"}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {status !== "CONVERTED" && status !== "LOST" && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMoveStatus(lead.id, "LOST", status);
                            }}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors"
                            aria-label="Mark as lost"
                          >
                            <X className="h-3 w-3 text-red-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextIdx = STATUSES.indexOf(status) + 1;
                              if (nextIdx < STATUSES.length - 1) {
                                onMoveStatus(lead.id, STATUSES[nextIdx], status);
                              }
                            }}
                            className="h-5 w-5 rounded flex items-center justify-center hover:bg-gold/20 transition-colors"
                            aria-label="Move to next stage"
                          >
                            <ArrowRight className="h-3 w-3 text-gold" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
