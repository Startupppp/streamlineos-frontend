"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowBigUp, Pencil } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import type { RoadmapItem } from "@/types/projects";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/features/build/shared/pm-chrome";
import { listItem, listItemReduced, pmSnappy } from "@/features/build/shared/pm-motion";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/features/build/shared/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

interface RoadmapItemCardProps {
  item: RoadmapItem;
  onEdit: (item: RoadmapItem) => void;
  onDelete: (item: RoadmapItem) => void;
}

export const RoadmapItemCard = memo(function RoadmapItemCard({
  item,
  onEdit,
  onDelete,
}: RoadmapItemCardProps) {
  const shouldReduceMotion = useReducedMotion();

  function handleEdit() {
    onEdit(item);
  }

  function handleDelete() {
    onDelete(item);
  }

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      className={cn(
        PM_PANEL,
        "group p-2.5 transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
      )}
    >
      <div className="space-y-2">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <TruncatedText text={item.title} lines={2} className="text-sm font-medium leading-snug" />
          <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <AnimatedIconButton
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={handleDelete}
              icon={Trash2Icon}
              iconSize={12}
            />
          </div>
        </div>
        {item.description ? (
          <p className={cn(TEXT_TWO_LINES, "text-xs text-muted-foreground")} title={item.description}>
            {item.description}
          </p>
        ) : null}
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {item.targetQuarter ? (
            <Badge variant="outline" className="text-[10px]">
              {item.targetQuarter}
            </Badge>
          ) : null}
          {item.category ? (
            <Badge variant="secondary" className={cn(TEXT_ONE_LINE, "max-w-[8rem] text-[10px]")}>
              {item.category}
            </Badge>
          ) : null}
          {!item.isPublic ? (
            <Badge variant="outline" className="text-[10px]">
              Private
            </Badge>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
            <ArrowBigUp className="h-3.5 w-3.5" />
            {item.votes}
          </span>
        </div>
      </div>
    </motion.div>
  );
});
