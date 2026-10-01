"use client";

import { cn } from "@/lib/utils";

export const COMMAND_ITEM_CLASS =
  "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground data-[selected=true]:bg-primary/5 data-[selected=true]:text-foreground";

export const COMMAND_ARROW_CLASS =
  "h-3.5 w-3.5 text-muted-foreground shrink-0 group-data-[selected=true]:text-foreground transition-colors";

export const COMMAND_SHORTCUT_CLASS =
  "text-muted-foreground group-data-[selected=true]:text-foreground";

export const COMMAND_GROUP_CLASS =
  "[&_[cmdk-group-heading]]:text-muted-foreground";

export function ItemIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
        "bg-muted text-muted-foreground",
        "transition-colors duration-150",
        "group-data-[selected=true]:bg-primary/10 group-data-[selected=true]:text-foreground",
      )}
    >
      <span className="flex items-center justify-center [&_svg]:!h-4 [&_svg]:!w-4">
        <Icon />
      </span>
    </span>
  );
}
