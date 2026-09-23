"use client";

import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { KbPlusIcon } from "@/features/wiki/lib/kb-icons";

export function WikiCollapsedSidebarChrome({
  createPending,
  onNewPage,
}: {
  createPending: boolean;
  onNewPage: () => void;
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 px-0 py-2">
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
