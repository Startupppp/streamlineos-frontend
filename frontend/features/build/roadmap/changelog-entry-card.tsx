"use client";

import { memo } from "react";
import { format } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { Pencil } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import type { ChangelogEntry } from "@/types/projects";
import { cn } from "@/lib/utils";
import { PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { listItem, listItemReduced, pmSnappy } from "@/lib/motion-presets";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CHANGELOG_TYPE_OPTIONS, CHANGELOG_TYPE_VARIANT } from "./roadmap-constants";

export interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  isUpdating: boolean;
  onTogglePublish: (entry: ChangelogEntry) => void;
  onEdit: (entry: ChangelogEntry) => void;
  onDelete: (entry: ChangelogEntry) => void;
}

export const ChangelogEntryCard = memo(function ChangelogEntryCard({
  entry,
  isUpdating,
  onTogglePublish,
  onEdit,
  onDelete,
}: ChangelogEntryCardProps) {
  const shouldReduceMotion = useReducedMotion();

  function handleTogglePublish() {
    onTogglePublish(entry);
  }

  function handleEdit() {
    onEdit(entry);
  }

  function handleDelete() {
    onDelete(entry);
  }

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
      className={cn(
        PM_PANEL,
        "p-3 transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <TruncatedText text={entry.title} className="text-sm font-medium" />
            <Badge variant={CHANGELOG_TYPE_VARIANT[entry.type]} className="text-micro">
              {CHANGELOG_TYPE_OPTIONS.find((o) => o.value === entry.type)?.label}
            </Badge>
            {entry.version ? (
              <Badge variant="outline" className="text-micro">
                {entry.version}
              </Badge>
            ) : null}
            <Badge variant={entry.isPublished ? "default" : "outline"} className="text-micro">
              {entry.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          {entry.content ? (
            <p
              className={cn(TEXT_TWO_LINES, "whitespace-pre-wrap text-xs text-muted-foreground")}
              title={entry.content}
            >
              {entry.content}
            </p>
          ) : null}
          <p className="text-dense text-muted-foreground">
            {entry.publishedAt
              ? `Published ${format(new Date(entry.publishedAt), "MMM d, yyyy")}`
              : `Created ${format(new Date(entry.createdAt), "MMM d, yyyy")}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={handleTogglePublish}
            disabled={isUpdating}
          >
            {entry.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button size="icon" variant="ghost" className="w-7" aria-label="Edit changelog entry" onClick={handleEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <AnimatedIconButton
            size="icon"
            variant="ghost"
            className="w-7 text-destructive hover:text-destructive"
            aria-label="Delete changelog entry"
            onClick={handleDelete}
            icon={Trash2Icon}
            iconSize={12}
          />
        </div>
      </div>
    </motion.div>
  );
});
