"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import { isBuildDestinationActive } from "@/lib/build/build-nav-model";
import {
  BUILD_NAV_MAX_PINS,
  type BuildNavDestination,
} from "@/lib/build/nav/build-nav-destination";

interface BuildMoreToolsMenuProps {
  tools: BuildNavDestination[];
  pathname: string;
  view: string | null;
  isCollapsed: boolean;
  isPinned: (toolId: string) => boolean;
  canPinMore: boolean;
  onTogglePin: (toolId: string) => void;
  onNavigate?: () => void;
}

interface ToolRowProps {
  tool: BuildNavDestination;
  isActive: boolean;
  isPinned: boolean;
  canPin: boolean;
  onTogglePin: (toolId: string) => void;
  onNavigate: () => void;
}

function ToolRow({
  tool,
  isActive,
  isPinned,
  canPin,
  onTogglePin,
  onNavigate,
}: ToolRowProps) {
  const Icon = tool.icon;

  function handleTogglePin() {
    onTogglePin(tool.id);
  }

  const pinLabel = isPinned
    ? `Unpin ${tool.label}`
    : canPin
      ? `Pin ${tool.label}`
      : `Pin limit of ${BUILD_NAV_MAX_PINS} reached`;

  return (
    <div className="group/tool flex items-center gap-0.5">
      <Link
        href={tool.href}
        onClick={onNavigate}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-label transition-colors motion-reduce:transition-none",
          isActive
            ? "bg-primary/10 font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        )}
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive && "text-primary")} />
        <span className="truncate">{tool.label}</span>
      </Link>
      <button
        type="button"
        onClick={handleTogglePin}
        disabled={!isPinned && !canPin}
        aria-label={pinLabel}
        title={pinLabel}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-30",
          isPinned
            ? "text-primary opacity-100"
            : "text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/tool:opacity-100",
        )}
      >
        {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function BuildMoreToolsMenu({
  tools,
  pathname,
  view,
  isCollapsed,
  isPinned,
  canPinMore,
  onTogglePin,
  onNavigate,
}: BuildMoreToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return tools;
    return tools.filter((tool) => tool.label.toLowerCase().includes(needle));
  }, [tools, query]);

  const anyActive = useMemo(
    () => tools.some((tool) => isBuildDestinationActive(tool, pathname, view)),
    [tools, pathname, view],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  }, []);

  const handleNavigate = useCallback(() => {
    setOpen(false);
    setQuery("");
    onNavigate?.();
  }, [onNavigate]);

  function renderTool(tool: BuildNavDestination) {
    return (
      <ToolRow
        key={tool.id}
        tool={tool}
        isActive={isBuildDestinationActive(tool, pathname, view)}
        isPinned={isPinned(tool.id)}
        canPin={canPinMore}
        onTogglePin={onTogglePin}
        onNavigate={handleNavigate}
      />
    );
  }

  if (tools.length === 0) return null;

  return (
    <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="ghost"
          {...animatedNavHoverHandlers}
          aria-label="More Build tools"
          className={cn(
            "h-8 w-full justify-start gap-2.5 rounded-md px-2.5 text-label font-medium",
            isCollapsed && "mx-auto h-8 w-8 justify-center px-0",
            anyActive
              ? "bg-primary/10 text-foreground"
              : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          )}
        >
          <SidebarAnimatedNavIcon
            icon={EllipsisIcon}
            iconRef={iconRef}
            className="h-4 w-4 shrink-0"
          />
          {isCollapsed ? null : <span>More tools</span>}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="More tools"
        side={isCollapsed ? "right" : "top"}
        align="start"
        sideOffset={8}
        className="flex w-72 flex-col overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-border/60 p-2">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search tools…"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-80 min-h-0 flex-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matching tools
            </p>
          ) : (
            <div className="space-y-0.5 p-1.5">{filtered.map(renderTool)}</div>
          )}
        </ScrollArea>
        <p className="shrink-0 border-t border-border/60 px-3 py-2 text-micro text-muted-foreground">
          Pin up to {BUILD_NAV_MAX_PINS} tools to this sidebar.
        </p>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
