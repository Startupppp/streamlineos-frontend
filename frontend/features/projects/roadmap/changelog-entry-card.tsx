"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ChangelogEntry } from "@/types/projects";
import { CHANGELOG_TYPE_OPTIONS, CHANGELOG_TYPE_VARIANT } from "./roadmap-constants";

export interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  isUpdating: boolean;
  onTogglePublish: (entry: ChangelogEntry) => void;
  onEdit: (entry: ChangelogEntry) => void;
  onDelete: (entry: ChangelogEntry) => void;
}

export function ChangelogEntryCard({
  entry,
  isUpdating,
  onTogglePublish,
  onEdit,
  onDelete,
}: ChangelogEntryCardProps) {
  function handleTogglePublish() { onTogglePublish(entry); }
  function handleEdit() { onEdit(entry); }
  function handleDelete() { onDelete(entry); }

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{entry.title}</p>
              <Badge variant={CHANGELOG_TYPE_VARIANT[entry.type]} className="text-[10px]">
                {CHANGELOG_TYPE_OPTIONS.find((o) => o.value === entry.type)?.label}
              </Badge>
              {entry.version && (
                <Badge variant="outline" className="text-[10px]">{entry.version}</Badge>
              )}
              <Badge variant={entry.isPublished ? "default" : "outline"} className="text-[10px]">
                {entry.isPublished ? "Published" : "Draft"}
              </Badge>
            </div>
            {entry.content && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                {entry.content}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {entry.publishedAt
                ? `Published ${format(new Date(entry.publishedAt), "MMM d, yyyy")}`
                : `Created ${format(new Date(entry.createdAt), "MMM d, yyyy")}`}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleTogglePublish}
              disabled={isUpdating}
            >
              {entry.isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
