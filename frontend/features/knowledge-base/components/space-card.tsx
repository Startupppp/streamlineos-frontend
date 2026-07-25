"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { spaceHref } from "@/features/knowledge-base/lib/knowledge-routes";
import {
  KbPencilIcon,
  KbTrash2Icon,
} from "@/features/knowledge-base/lib/kb-icons";
import type { KbSpace, KbAudience } from "@/types/kb";

const AUDIENCE_LABELS: Record<KbAudience, string> = {
  internal: "Internal",
  public: "Public",
  mixed: "Mixed",
};

const AUDIENCE_BADGE_CLASS: Record<KbAudience, string> = {
  internal: "bg-muted text-muted-foreground border-border",
  public: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
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
  space: KbSpace;
  canManage: boolean;
  pageCount: number;
  onEdit: (space: KbSpace) => void;
  onDelete: (space: KbSpace) => void;
}

export function SpaceCard({
  space,
  canManage,
  pageCount,
  onEdit,
  onDelete,
}: SpaceCardProps) {
  function handleEdit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onEdit(space);
  }

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    onDelete(space);
  }

  const audience = space.audience ?? "internal";

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
          className={`text-[10px] h-4 px-1.5 shrink-0 ${AUDIENCE_BADGE_CLASS[audience]}`}
        >
          {AUDIENCE_LABELS[audience]}
        </Badge>
      </div>
      {space.description && (
        <TruncatedText text={space.description} className="text-sm text-muted-foreground" />
      )}
      <p className="text-xs text-muted-foreground">
        {pageCount} {pageCount === 1 ? "page" : "pages"}
      </p>
      {canManage && (
        <div className="flex items-center gap-1 pt-1">
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
            className="px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <KbTrash2Icon className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      )}
    </Link>
  );
}
