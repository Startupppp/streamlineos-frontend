"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { spaceHref } from "@/lib/knowledge-routes";
import { cn } from "@/lib/utils";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KbArchiveIcon,
  KbClockIcon,
  KbFileTextIcon,
  KbPencilIcon,
  KbRotateCcwIcon,
  KbTrash2Icon,
  KbTriangleAlertIcon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import type { KbAudience } from "@/types/kb";
import type { KbSpaceListItem } from "@/hooks/api/kb/kb-spaces-settings-schema";

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const AUDIENCE_BADGE_CLASS: Record<KbAudience, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  public:
    "bg-status-success-surface text-status-success-ink border-status-success-rule",
  mixed: "bg-primary/10 text-foreground border-primary/20",
};

export function SpaceCardSkeleton() {
  return (
    <div className={cn(CONTENT_PANEL_SOLID, "flex h-full flex-col gap-3 p-4")}>
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="flex min-w-0 gap-2">
        <Skeleton className="h-7 min-w-0 flex-1 rounded-md" />
        <Skeleton className="h-7 min-w-0 flex-1 rounded-md" />
      </div>
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

interface SpaceCardProps {
  space: KbSpaceListItem;
  canManage: boolean;
  pageCount: number;
  onEdit: (space: KbSpaceListItem) => void;
  onArchiveToggle: (space: KbSpaceListItem) => void;
  onDelete: (space: KbSpaceListItem) => void;
  onViewMembers: (space: KbSpaceListItem) => void;
}

export function SpaceCard({
  space,
  canManage,
  pageCount,
  onEdit,
  onArchiveToggle,
  onDelete,
  onViewMembers,
}: SpaceCardProps) {
  function handleEdit() {
    onEdit(space);
  }

  function handleArchiveToggle() {
    onArchiveToggle(space);
  }

  function handleDelete() {
    onDelete(space);
  }

  function handleViewMembers() {
    onViewMembers(space);
  }

  const audience = space.audience ?? "internal";
  const isArchived = space.archivedAt !== null;
  const fileLabel = pageCount === 1 ? "file" : "files";
  const memberLabel = space.memberCount === 1 ? "member" : "members";

  return (
    <article
      className={cn(
        CONTENT_PANEL_SOLID,
        "group flex flex-col gap-0 overflow-hidden transition-[border-color,box-shadow,background-color]",
        "hover:border-primary/40 hover:shadow-md",
      )}
    >
      <Link
        href={spaceHref(space.id)}
        aria-label={`Open ${space.name}`}
        className="flex min-h-0 flex-1 flex-col gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl leading-none"
            aria-hidden
          >
            {space.icon || "📚"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <TruncatedText
                text={space.name}
                className="text-sm font-semibold text-foreground text-pretty"
              />
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                {isArchived && (
                  <Badge
                    variant="outline"
                    className="h-5 px-1.5 text-micro text-muted-foreground"
                  >
                    Archived
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 px-1.5 text-micro",
                    AUDIENCE_BADGE_CLASS[audience],
                  )}
                >
                  {AUDIENCE_LABELS[audience]}
                </Badge>
              </div>
            </div>
            {space.description ? (
              <TruncatedText
                text={space.description}
                lines={2}
                className="mt-1 text-xs leading-relaxed text-muted-foreground"
              />
            ) : (
              <p className="mt-1 text-xs text-muted-foreground/80">No description</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs tabular-nums text-foreground">
            <KbFileTextIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {pageCount} {fileLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs tabular-nums text-foreground">
            <KbUsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {space.memberCount} {memberLabel}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            {space.ownerName ? (
              <span className="min-w-0 truncate">Owned by {space.ownerName}</span>
            ) : null}
            {space.ownerName ? (
              <span aria-hidden className="text-border">
                ·
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1" suppressHydrationWarning>
              <KbClockIcon className="h-3 w-3 shrink-0" />
              Updated {kbTimeAgo(space.updatedAt)}
            </span>
          </p>
          {canManage && space.pagesOverdueForReview > 0 && (
            <Badge
              variant="outline"
              className="h-5 w-fit px-1.5 text-micro bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule"
            >
              <KbTriangleAlertIcon className="mr-1 h-3 w-3" />
              {space.pagesOverdueForReview}{" "}
              {space.pagesOverdueForReview === 1 ? "file" : "files"} overdue for
              review
            </Badge>
          )}
        </div>
      </Link>

      {canManage && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border bg-muted/30 px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleViewMembers}
          >
            <KbUsersIcon className="mr-1 h-3.5 w-3.5" />
            Members
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleEdit}
          >
            <KbPencilIcon className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleArchiveToggle}
          >
            {isArchived ? (
              <KbRotateCcwIcon className="mr-1 h-3.5 w-3.5" />
            ) : (
              <KbArchiveIcon className="mr-1 h-3.5 w-3.5" />
            )}
            {isArchived ? "Restore" : "Archive"}
          </Button>
          {isArchived && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <KbTrash2Icon className="mr-1 h-3.5 w-3.5" />
              Delete permanently
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
