"use client";

import { useCallback } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Mail, Star, Briefcase } from "lucide-react";
import type { Candidate, CandidateStatus } from "@/types/hr";

const COLUMNS: { id: CandidateStatus; label: string; color: string }[] = [
  { id: "NEW", label: "New", color: "bg-blue-500" },
  { id: "SCREENING", label: "Screening", color: "bg-yellow-500" },
  { id: "INTERVIEW", label: "Interview", color: "bg-purple-500" },
  { id: "OFFER", label: "Offer", color: "bg-orange-500" },
  { id: "HIRED", label: "Hired", color: "bg-green-500" },
  { id: "REJECTED", label: "Rejected", color: "bg-red-500" },
];

interface CandidateKanbanProps {
  pipeline: Record<string, Candidate[]>;
  onStatusChange: (candidateId: number, newStatus: CandidateStatus) => void;
}

export function CandidateKanban({ pipeline, onStatusChange }: CandidateKanbanProps) {
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const candidateId = Number(result.draggableId);
      const newStatus = result.destination.droppableId as CandidateStatus;
      if (result.source.droppableId !== newStatus) {
        onStatusChange(candidateId, newStatus);
      }
    },
    [onStatusChange]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const items = pipeline[col.id] ?? [];
          return (
            <div key={col.id} className="flex flex-col min-w-[240px] w-[240px] shrink-0">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`h-2 w-2 rounded-full ${col.color}`} />
                <span className="text-xs font-semibold">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">{items.length}</Badge>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[200px] rounded-lg border border-dashed p-1.5 space-y-1.5 transition-colors ${
                      snapshot.isDraggingOver ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
                    }`}
                  >
                    <ScrollArea className="h-[calc(100vh-340px)]">
                      <div className="space-y-1.5 pr-1">
                        {items.map((candidate, index) => (
                          <Draggable key={candidate.id} draggableId={String(candidate.id)} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <Link href={`/hr/recruitment/candidates/${candidate.id}`}>
                                  <Card className={`p-2.5 cursor-pointer hover:shadow-sm transition-shadow ${
                                    dragSnapshot.isDragging ? "shadow-md ring-2 ring-primary/20" : ""
                                  }`}>
                                    <div className="flex items-start gap-2">
                                      <Avatar className="h-7 w-7 shrink-0">
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                          {candidate.firstName[0]}{candidate.lastName[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium truncate">
                                          {candidate.firstName} {candidate.lastName}
                                        </p>
                                        {candidate.currentRole && (
                                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                            <Briefcase className="h-2.5 w-2.5" />
                                            {candidate.currentRole}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                          {candidate.source && (
                                            <Badge variant="outline" className="text-[8px] px-1 py-0">{candidate.source}</Badge>
                                          )}
                                          {candidate.rating && (
                                            <div className="flex items-center gap-0.5">
                                              <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                              <span className="text-[10px] font-medium">{candidate.rating}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </Card>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
