"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectNavGroup, ProjectNavItem } from "./project-nav-config";

interface ProjectNavSectionProps {
  group: ProjectNavGroup;
  collapsed: boolean;
  hasActiveChild: boolean;
  renderItem: (item: ProjectNavItem) => ReactNode;
}

export function ProjectNavSection({
  group,
  collapsed,
  hasActiveChild,
  renderItem,
}: ProjectNavSectionProps) {
  const pinned = Boolean(group.pinned);
  const [expanded, setExpanded] = useState(
    () => pinned || Boolean(group.defaultOpen),
  );

  const open = pinned || hasActiveChild || expanded;

  const handleToggle = useCallback(() => {
    if (pinned) return;
    setExpanded((prev) => !prev);
  }, [pinned]);

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => renderItem(item))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {pinned ? (
        <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55">
          {group.label}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={open}
          className={cn(
            "group/section flex w-full items-center gap-1 rounded-md px-2.5 py-1",
            "text-[10px] font-semibold uppercase tracking-[0.14em]",
            "text-muted-foreground/55 transition-colors",
            "hover:bg-muted/40 hover:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            hasActiveChild && "text-muted-foreground",
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{group.label}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0 opacity-60 transition-transform duration-150 ease-out",
              open ? "rotate-0" : "-rotate-90",
            )}
            aria-hidden
          />
        </button>
      )}

      {open ? (
        <div className="space-y-0.5" role="list">
          {group.items.map((item) => renderItem(item))}
        </div>
      ) : null}
    </div>
  );
}
