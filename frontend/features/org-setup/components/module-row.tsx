"use client";

import { memo, type Ref } from "react";
import type { IconHandle } from "@animateicons/react";
import { LayoutGridIcon } from "@animateicons/react/lucide";
import { Switch } from "@/components/ui/switch";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

type ModuleRowProps = {
  moduleKey: string;
  label: string;
  description: string;
  selected: boolean;
  onToggle: (moduleKey: string) => void;
};

function ModuleRowInner({ moduleKey, label, description, selected, onToggle }: ModuleRowProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleCheckedChange() {
    onToggle(moduleKey);
  }

  return (
    <div
      {...hoverHandlers}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors",
        selected
          ? "border-brand-core/40 bg-brand-core/5 dark:bg-brand-core/10"
          : "border-border/80 bg-background/50",
      )}
    >
      <LayoutGridIcon
        ref={iconRef as Ref<IconHandle>}
        size={14}
        className={cn("shrink-0", selected ? "text-brand-core" : "text-muted-foreground")}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{label}</span>
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-medium",
              selected
                ? "border-brand-core/30 bg-brand-core/10 text-brand-deep dark:bg-brand-core/15 dark:text-brand-bright"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {selected ? "Included" : "Optional"}
          </span>
        </div>
        <TruncatedText text={description} className="text-xs text-muted-foreground" />
      </div>
      <Switch
        checked={selected}
        onCheckedChange={handleCheckedChange}
        aria-label={`Toggle ${label}`}
        className="shrink-0"
      />
    </div>
  );
}

export const ModuleRow = memo(ModuleRowInner);
