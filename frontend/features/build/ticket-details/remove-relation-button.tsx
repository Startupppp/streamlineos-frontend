"use client";

import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

function stopProp(e: React.MouseEvent | React.KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function RemoveRelationButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleClick(e: React.MouseEvent) {
    stopProp(e);
    onClick();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={stopProp}
      aria-label="Remove relation"
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 hover:bg-muted/60"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={12} />
    </button>
  );
}
