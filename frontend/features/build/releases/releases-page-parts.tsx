"use client";

import { useCallback, type MouseEvent } from "react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Release } from "@/hooks/api/build/releases";

export const STATUS_CONFIG: Record<
  Release["status"],
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "text-status-warning-ink border-status-warning-rule bg-status-warning-surface",
  },
  released: {
    label: "Released",
    className:
      "text-status-success-ink border-status-success-rule bg-status-success-surface",
  },
  archived: {
    label: "Archived",
    className:
      "text-muted-foreground border-border bg-muted",
  },
};

export function statusSort(r: Release): number {
  return r.status === "released" ? 0 : r.status === "draft" ? 1 : 2;
}

export function NewReleaseButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      size="sm"
      className="gap-1 text-dense"
      onClick={onClick}
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={14} />
      New Release
    </Button>
  );
}

export function DeleteReleaseButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClick();
    },
    [onClick],
  );
  return (
    <Button
      size="icon"
      variant="ghost"
      className="w-7 text-destructive hover:text-destructive"
      onClick={handleClick}
      aria-label="Delete release"
      {...hoverHandlers}
    >
      <Trash2Icon ref={iconRef} size={12} />
    </Button>
  );
}
