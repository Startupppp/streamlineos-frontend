"use client";

import { useCallback } from "react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { useReleaseActions } from "./release-actions-context";

interface ReleaseRowActionsProps {
  release: ManagedProductRelease;
}

export function ReleaseRowActions({ release }: ReleaseRowActionsProps) {
  const { pendingReleaseId, onEdit, onMarkReleased, onArchive, onRestore, onViewDetails } = useReleaseActions();
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const isPending = pendingReleaseId === release.id;

  const canUpdate = release.allowedActions.includes("update");
  const canArchive = release.allowedActions.includes("archive");
  const canRestore = release.allowedActions.includes("restore");

  const handleEdit = useCallback(() => onEdit(release), [onEdit, release]);
  const handleMarkReleased = useCallback(() => onMarkReleased(release), [onMarkReleased, release]);
  const handleArchive = useCallback(() => onArchive(release), [onArchive, release]);
  const handleRestore = useCallback(() => onRestore(release), [onRestore, release]);
  const handleViewDetails = useCallback(() => onViewDetails(release), [onViewDetails, release]);

  if (!canUpdate && !canArchive && !canRestore) return null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:block">{formatRelativeTime(release.updatedAt)}</span>
      {release.status === "draft" && canUpdate ? (
        <LoadingButton
          type="button"
          variant="outline"
          size="sm"
          isPending={isPending}
          loadingText="Releasing…"
          onClick={handleMarkReleased}
        >
          Mark released
        </LoadingButton>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="w-7"
            aria-label={`Actions for ${release.name}`}
            disabled={isPending}
            {...hoverHandlers}
          >
            <EllipsisIcon ref={iconRef} size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleViewDetails}>View evidence</DropdownMenuItem>
          {canUpdate ? (
            <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
          ) : null}
          {release.status === "archived" && canRestore ? (
            <DropdownMenuItem onSelect={handleRestore}>Restore</DropdownMenuItem>
          ) : null}
          {release.status !== "archived" && canArchive ? (
            <DropdownMenuItem variant="destructive" onSelect={handleArchive}>
              Archive
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
