"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { KbPlusIcon } from "@/features/wiki/lib/kb-icons";

export function WikiSidebarCollapseControl({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  function handleClick() {
    onToggleCollapsed();
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      onClick={handleClick}
      className={
        collapsed
          ? "flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          : "absolute top-1/2 right-0 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      }
    >
      {collapsed ? (
        <ChevronRight className="size-4" />
      ) : (
        <ChevronLeft className="size-4" />
      )}
    </button>
  );
}

export function WikiCollapsedSidebarChrome({
  createPending,
  onToggleCollapsed,
  onNewPage,
}: {
  createPending: boolean;
  onToggleCollapsed: () => void;
  onNewPage: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 px-0 py-2">
      <WikiSidebarCollapseControl
        collapsed
        onToggleCollapsed={onToggleCollapsed}
      />
      <AnimatedIconButton
        type="button"
        variant="ghost"
        size="icon"
        icon={KbPlusIcon}
        iconSize={16}
        className="size-7"
        onClick={onNewPage}
        disabled={createPending}
        aria-label="New page"
      />
    </div>
  );
}
