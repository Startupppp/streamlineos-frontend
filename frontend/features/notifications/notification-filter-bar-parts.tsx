"use client";

import { type ReactNode } from "react";
import { Check } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FilterMenuItem({
  label,
  active,
  onSelect,
  badge,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      className="relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
    >
      <span className={cn("flex h-3.5 w-3.5 items-center justify-center", !active && "opacity-0")}>
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

export function FilterSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{children}</p>
  );
}

export function FilterSectionDivider() {
  return <div className="-mx-1 my-1 h-px bg-border" />;
}

export function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="hidden sm:inline-flex h-8 shrink-0 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground focus-visible:border-transparent focus-visible:ring-border focus-visible:ring-[3px] transition-colors"
      onClick={onClick}
      aria-label="Clear filters"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
      Clear
    </Button>
  );
}
