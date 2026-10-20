"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ListChecks, SlidersHorizontal } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchInput } from "@/components/ui/search-input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ModuleAccent, NavGroup } from "./sidebar-nav-items";
import { presentHrGroups } from "./hr-sidebar-filter";
import { HrSidebarItem } from "./hr-sidebar-item";

interface HrSidebarNavProps {
  groups: NavGroup[];
  isCollapsed: boolean;
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (label: string) => void;
  onOpenGroup: (label: string) => void;
  pendingLeaves: number;
  inboxCount: number;
  onNavigate?: () => void;
  accent: ModuleAccent;
  showAdvanced: boolean;
  onShowAdvancedChange: (next: boolean) => void;
}

export function HrSidebarNav({
  groups,
  isCollapsed,
  collapsedGroups,
  onToggleGroup,
  onOpenGroup,
  pendingLeaves,
  inboxCount,
  onNavigate,
  accent,
  showAdvanced,
  onShowAdvancedChange,
}: HrSidebarNavProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const filtering = !isCollapsed && query.trim().length > 0;
  const visibleGroups = useMemo(
    () => presentHrGroups(groups, filtering ? query : ""),
    [groups, query, filtering],
  );
  const showGroupLabels = filtering || groups.length > 1;

  function handleQueryChange(value: string) {
    setQuery(value);
  }

  function handleSimple() {
    onShowAdvancedChange(false);
  }

  function handleAdvanced() {
    onShowAdvancedChange(true);
  }

  function handleToggleAdvanced() {
    onShowAdvancedChange(!showAdvanced);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!isCollapsed && (
        <div className="shrink-0 space-y-2 border-b border-sidebar-border px-2.5 py-2.5">
          <SearchInput
            value={query}
            onValueChange={handleQueryChange}
            placeholder="Find a page"
            aria-label="Find a page in HR"
            fill
            className="min-w-0"
            inputClassName="bg-sidebar text-sidebar-foreground border-sidebar-border placeholder:text-sidebar-foreground/80"
          />
          <div
            role="group"
            aria-label="HR navigation depth"
            className="grid grid-cols-2 gap-0.5 rounded-md bg-sidebar-accent p-0.5"
          >
            <button
              type="button"
              aria-pressed={!showAdvanced}
              onClick={handleSimple}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-sm text-xs font-medium transition-colors motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                !showAdvanced
                  ? "bg-sidebar text-sidebar-foreground shadow-xs"
                  : "text-sidebar-foreground/80 hover:text-sidebar-foreground",
              )}
            >
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              Simple
            </button>
            <button
              type="button"
              aria-pressed={showAdvanced}
              onClick={handleAdvanced}
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-sm text-xs font-medium transition-colors motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                showAdvanced
                  ? "bg-sidebar text-sidebar-foreground shadow-xs"
                  : "text-sidebar-foreground/80 hover:text-sidebar-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Advanced
            </button>
          </div>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="HR" className={cn("py-2", isCollapsed ? "px-1" : "px-2.5")}>
          {visibleGroups.length === 0 ? (
            <p role="status" className="px-2 py-8 text-center text-sm text-sidebar-foreground">
              No pages match &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            visibleGroups.map((group, index) => (
              <HrSidebarGroup
                key={group.label}
                group={group}
                index={index}
                pathname={pathname}
                isCollapsed={isCollapsed}
                showLabel={showGroupLabels}
                isGroupCollapsed={
                  groups.length > 1 && !filtering && (collapsedGroups[group.label] ?? false)
                }
                onToggleGroup={onToggleGroup}
                onOpenGroup={onOpenGroup}
                pendingLeaves={pendingLeaves}
                inboxCount={inboxCount}
                onNavigate={onNavigate}
                accent={accent}
                forceExpanded={filtering}
              />
            ))
          )}
        </nav>
      </ScrollArea>

      {isCollapsed && (
        <div className="shrink-0 border-t border-sidebar-border px-1 py-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-pressed={showAdvanced}
                aria-label={showAdvanced ? "Showing advanced HR pages" : "Showing simple HR pages"}
                onClick={handleToggleAdvanced}
                className={cn(
                  "nav-item mx-auto flex h-8 w-8 justify-center",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  showAdvanced && "active",
                )}
              >
                {showAdvanced ? (
                  <SlidersHorizontal className="nav-icon h-4 w-4" />
                ) : (
                  <ListChecks className="nav-icon h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {showAdvanced ? "Advanced pages" : "Simple pages"}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

interface HrSidebarGroupProps {
  group: NavGroup;
  index: number;
  pathname: string;
  isCollapsed: boolean;
  showLabel: boolean;
  isGroupCollapsed: boolean;
  onToggleGroup: (label: string) => void;
  onOpenGroup: (label: string) => void;
  pendingLeaves: number;
  inboxCount: number;
  onNavigate?: () => void;
  accent: ModuleAccent;
  forceExpanded: boolean;
}

function HrSidebarGroup({
  group,
  index,
  pathname,
  isCollapsed,
  showLabel,
  isGroupCollapsed,
  onToggleGroup,
  onOpenGroup,
  pendingLeaves,
  inboxCount,
  onNavigate,
  accent,
  forceExpanded,
}: HrSidebarGroupProps) {
  function handleToggle() {
    onToggleGroup(group.label);
  }

  function handleGroupHover() {
    if (forceExpanded || isCollapsed) return;
    onOpenGroup(group.label);
  }

  const showItems = isCollapsed || !isGroupCollapsed;

  return (
    <div
      className={cn(index > 0 && (isCollapsed ? "mt-1.5" : "mt-4"))}
      onMouseEnter={
        forceExpanded || isCollapsed ? undefined : handleGroupHover
      }
    >
      {!isCollapsed && showLabel &&
        (forceExpanded ? (
          <div className="mb-0.5 flex min-h-8 items-center px-2">
            <span className="text-xs font-semibold text-sidebar-foreground">{group.label}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            aria-expanded={!isGroupCollapsed}
            className="mb-0.5 flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none"
          >
            <span className="text-xs font-semibold text-sidebar-foreground">{group.label}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/70 transition-transform duration-150 motion-reduce:transition-none",
                isGroupCollapsed && "-rotate-90",
              )}
            />
          </button>
        ))}

      {isCollapsed && index > 0 && (
        <div className="mx-auto my-1.5 h-px w-5 bg-sidebar-border" />
      )}

      {showItems && (
        <div className="space-y-0.5">
          {group.routes.map((route) => (
            <HrSidebarItem
              key={route.href}
              route={route}
              pathname={pathname}
              pendingLeaves={pendingLeaves}
              inboxCount={inboxCount}
              onNavigate={onNavigate}
              accent={accent}
              depth={0}
              forceExpanded={forceExpanded}
              iconsOnly={isCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
