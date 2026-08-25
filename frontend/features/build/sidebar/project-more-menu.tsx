"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";

import { EllipsisIcon, SlidersHorizontalIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import type { ProjectNavGroup, ProjectNavItem } from "./project-nav-config";
import { useProjectNavIsActive } from "./use-project-nav";

interface ProjectMoreMenuProps {
  baseUrl: string;
  groups: ProjectNavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
  onCustomize?: () => void;
}

export function ProjectMoreMenu({
  baseUrl,
  groups,
  collapsed,
  onNavigate,
  onCustomize,
}: ProjectMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isActive = useProjectNavIsActive(baseUrl);
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();
  const customizeHover = useAnimatedNavIconHover();

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.label.toLowerCase().includes(q) || i.id.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const anyActive = flat.some((i) => isActive(i.href));

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery("");
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const handleItemClick = useCallback(() => {
    setOpen(false);
    setQuery("");
    onNavigate?.();
  }, [onNavigate]);

  const handleCustomize = useCallback(() => {
    setOpen(false);
    setQuery("");
    onCustomize?.();
  }, [onCustomize]);

  return (
    <ResponsivePopover open={open} onOpenChange={handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="ghost"
          {...animatedNavHoverHandlers}
          className={cn(
            "relative h-8 w-full justify-start gap-2 rounded-md px-2 text-label font-medium",
            collapsed && "mx-auto h-8 w-8 justify-center px-0",
            anyActive
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
          aria-label="More project tools"
        >
          <SidebarAnimatedNavIcon
            icon={EllipsisIcon}
            iconRef={iconRef}
            className="h-4 w-4 shrink-0"
          />
          {!collapsed ? <span>More</span> : null}
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title="More tools"
        side={collapsed ? "right" : "top"}
        align="start"
        sideOffset={8}
        className="flex w-72 flex-col overflow-hidden border-border/60 bg-card/95 p-0 shadow-xl backdrop-blur-xl"
      >
        <div className="relative shrink-0 border-b border-border/50 p-2">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.06] to-transparent"
          />
          <div className="min-w-0 border-border/60 bg-background/60">
            <SearchInput
              value={query}
              onValueChange={handleQueryChange}
              placeholder="Search tools…"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea fill className="min-h-0 max-h-80 flex-1">
          {filteredGroups.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {query.trim()
                ? "No matching tools"
                : "All tools are in the sidebar"}
            </p>
          ) : (
            <div className="p-1.5">
              {filteredGroups.map((group) => (
                <div key={group.id} className="mb-1.5 last:mb-0">
                  <p className="px-2 py-1 text-micro font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <MoreLink
                        key={item.id}
                        item={item}
                        active={isActive(item.href)}
                        onClick={handleItemClick}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {onCustomize ? (
          <div className="shrink-0 border-t border-border/50 bg-card p-1.5">
            <button
              type="button"
              onClick={handleCustomize}
              {...customizeHover.animatedNavHoverHandlers}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-label font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              <SidebarAnimatedNavIcon
                icon={SlidersHorizontalIcon}
                iconRef={customizeHover.iconRef}
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
              />
              <span>Customize sidebar</span>
            </button>
          </div>
        ) : null}
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}

function MoreLink({
  item,
  active,
  onClick,
}: {
  item: ProjectNavItem;
  active: boolean;
  onClick: () => void;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      {...animatedNavHoverHandlers}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-label transition-all duration-150",
        active
          ? "bg-primary/10 font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <SidebarAnimatedNavIcon
        icon={Icon}
        iconRef={iconRef}
        className={cn("h-3.5 w-3.5 shrink-0", active && "text-primary")}
      />
      <span className="truncate tracking-tight">{item.label}</span>
    </Link>
  );
}
