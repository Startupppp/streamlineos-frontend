"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { spaceHref } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KbArchiveIcon,
  KbPencilIcon,
  KbRotateCcwIcon,
  KbTriangleAlertIcon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import type { KbAudience } from "@/types/kb";
import type { KbSpaceListItem } from "@/hooks/api/kb/spaces";

export type { KbSpaceListItem as SpaceCardItem };

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const AUDIENCE_BADGE_CLASS: Record<KbAudience, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  public: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  mixed: "bg-primary/10 text-foreground border-primary/20",
};

export function SpaceCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

interface SpaceCardProps {
  space: KbSpaceListItem;
  canManage: boolean;
  pageCount: number;
  onEdit: (space: KbSpaceListItem) => void;
  onArchiveToggle: (space: KbSpaceListItem) => void;
  onViewMembers: (space: KbSpaceListItem) => void;
}

export function SpaceCard({
  space,
  canManage,
  pageCount,
  onEdit,
  onArchiveToggle,
  onViewMembers,
}: SpaceCardProps) {
  function handleEdit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onEdit(space);
  }

  function handleArchiveToggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onArchiveToggle(space);
  }

  function handleViewMembers(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onViewMembers(space);
  }

  const audience = space.audience ?? "internal";
  const isArchived = space.archivedAt !== null;

  return (
    <Link
      href={spaceHref(space.id)}
      className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{space.icon ?? "📚"}</span>
          <TruncatedText text={space.name} className="text-sm font-semibold text-foreground" />
        </div>
        <Badge
          variant="outline"
          className={`text-micro h-4 px-1.5 shrink-0 ${AUDIENCE_BADGE_CLASS[audience]}`}
        >
          {AUDIENCE_LABELS[audience]}
        </Badge>
      </div>
      {space.description && (
        <TruncatedText text={space.description} className="text-sm text-muted-foreground" />
      )}
      <p className="text-xs text-muted-foreground tabular-nums">
        {pageCount} {pageCount === 1 ? "page" : "pages"} · {space.memberCount}{" "}
        {space.memberCount === 1 ? "member" : "members"}
      </p>
      <p className="text-xs text-muted-foreground" suppressHydrationWarning>
        {space.ownerName ? `Owned by ${space.ownerName} · ` : ""}
        Updated {kbTimeAgo(space.updatedAt)}
      </p>
      {canManage && space.pagesOverdueForReview > 0 && (
        <Badge
          variant="outline"
          className="w-fit text-micro h-4 px-1.5 bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule"
        >
          <KbTriangleAlertIcon className="h-3 w-3 mr-1" />
          {space.pagesOverdueForReview}{" "}
          {space.pagesOverdueForReview === 1 ? "page" : "pages"} overdue for review
        </Badge>
      )}
      {canManage && (
        <div className="flex items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-xs text-muted-foreground"
            onClick={handleViewMembers}
          >
            <KbUsersIcon className="h-3 w-3 mr-1" />
            Members
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-xs text-muted-foreground"
            onClick={handleEdit}
          >
            <KbPencilIcon className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-xs text-muted-foreground"
            onClick={handleArchiveToggle}
          >
            {isArchived ? (
              <KbRotateCcwIcon className="h-3 w-3 mr-1" />
            ) : (
              <KbArchiveIcon className="h-3 w-3 mr-1" />
            )}
            {isArchived ? "Restore" : "Archive"}
          </Button>
        </div>
      )}
    </Link>
  );
}
