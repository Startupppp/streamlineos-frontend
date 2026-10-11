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
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { useReleaseActions } from "./release-actions-context";

interface ReleaseRowActionsProps {
  release: ManagedProductRelease;
}

export function ReleaseRowActions({ release }: ReleaseRowActionsProps) {
  const { canUpdate, pendingReleaseId, onEdit, onMarkReleased, onArchive, onRestore } =
    useReleaseActions();
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const isPending = pendingReleaseId === release.id;

  const handleEdit = useCallback(() => onEdit(release), [onEdit, release]);
  const handleMarkReleased = useCallback(() => onMarkReleased(release), [onMarkReleased, release]);
  const handleArchive = useCallback(() => onArchive(release), [onArchive, release]);
  const handleRestore = useCallback(() => onRestore(release), [onRestore, release]);

  if (!canUpdate) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {release.status === "draft" ? (
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
          <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
          {release.status === "archived" ? (
            <DropdownMenuItem onSelect={handleRestore}>Restore</DropdownMenuItem>
          ) : (
            <DropdownMenuItem variant="destructive" onSelect={handleArchive}>
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
