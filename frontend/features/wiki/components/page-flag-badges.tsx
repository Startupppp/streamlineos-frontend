"use client";

import { Badge } from "@/components/ui/badge";
import { KbLockIcon, KbStarIcon } from "@/features/wiki/lib/kb-icons";

export function PageFlagBadges({
  isLocked,
  isFavorite,
}: {
  isLocked: boolean;
  isFavorite: boolean;
}) {
  if (!isLocked && !isFavorite) return null;
  return (
    <>
      {isLocked ? (
        <Badge variant="outline" className="h-5 gap-1 border-border bg-muted px-1.5 text-micro text-foreground">
          <KbLockIcon className="size-3" />
          Locked
        </Badge>
      ) : null}
      {isFavorite ? (
        <Badge variant="outline" className="h-5 gap-1 border-status-warning-rule bg-status-warning-surface px-1.5 text-micro text-status-warning-ink">
          <KbStarIcon className="size-3" />
          Starred
        </Badge>
      ) : null}
    </>
  );
}
