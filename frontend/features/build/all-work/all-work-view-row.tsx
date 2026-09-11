"use client";

import { Pin, PinOff, Users, Lock } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { isActivationKey } from "@/lib/keyboard-activation";
import type { ProjectView } from "@/types/projects";

interface AllWorkViewRowProps {
  view: ProjectView;
  currentUserId: string | undefined;
  onApply: (view: ProjectView) => void;
  onTogglePin: (view: ProjectView) => void;
  onDelete: (view: ProjectView) => void;
}

export function AllWorkViewRow({
  view,
  currentUserId,
  onApply,
  onTogglePin,
  onDelete,
}: AllWorkViewRowProps) {
  const { iconRef: deleteIconRef, hoverHandlers: deleteHoverHandlers } =
    useAnimatedIcon();
  const isOwner =
    !view.createdBy || !currentUserId || view.createdBy === currentUserId;
  const isShared = view.visibility === "shared";

  function handleApply(e: React.MouseEvent) {
    e.stopPropagation();
    onApply(view);
  }

  function handleTogglePin(e: React.MouseEvent) {
    e.stopPropagation();
    onTogglePin(view);
  }

  function handleActivationKeyDown(e: React.KeyboardEvent) {
    if (!isActivationKey(e)) return;
    e.preventDefault();
    onApply(view);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(view);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleApply}
      onKeyDown={handleActivationKeyDown}
      className="group flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:bg-accent transition-colors"
    >
      <span className="min-w-0 flex-1 truncate font-medium">{view.name}</span>

      <span
        className="shrink-0 text-muted-foreground group-hover:text-accent-foreground"
        title={isShared ? "Shared" : "Personal"}
      >
        {isShared ? (
          <Users className="h-3 w-3" />
        ) : (
          <Lock className="h-3 w-3" />
        )}
      </span>

      {isOwner && (
        <>
          <button
            type="button"
            onClick={handleTogglePin}
            title={view.isPinned ? "Unpin" : "Pin"}
            aria-label={view.isPinned ? `Unpin ${view.name}` : `Pin ${view.name}`}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            {view.isPinned ? (
              <PinOff className="h-3 w-3" />
            ) : (
              <Pin className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Delete view"
            aria-label={`Delete ${view.name}`}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
            {...deleteHoverHandlers}
          >
            <Trash2Icon ref={deleteIconRef} size={12} />
          </button>
        </>
      )}
    </div>
  );
}
