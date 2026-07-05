"use client";

import { memo } from "react";
import { ArrowBigUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RoadmapItem } from "@/types/projects";

interface RoadmapItemCardProps {
  item: RoadmapItem;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (item: RoadmapItem) => void;
}

export const RoadmapItemCard = memo(function RoadmapItemCard({ item, onEdit, onDelete }: RoadmapItemCardProps) {
  function handleEdit() {
    onEdit(item);
  }
  function handleDelete() {
    onDelete(item);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-2.5 shadow-sm hover:shadow-md transition-shadow mb-1.5">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug min-w-0">{item.title}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {item.targetQuarter && (
            <Badge variant="outline" className="text-[10px]">{item.targetQuarter}</Badge>
          )}
          {item.category && (
            <Badge variant="secondary" className="text-[10px]">{item.category}</Badge>
          )}
          {!item.isPublic && (
            <Badge variant="outline" className="text-[10px]">Private</Badge>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
            <ArrowBigUp className="h-3.5 w-3.5" />
            {item.votes}
          </span>
        </div>
      </div>
    </div>
  );
});
