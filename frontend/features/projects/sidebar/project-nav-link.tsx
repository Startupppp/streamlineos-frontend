"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ProjectNavItem } from "./project-nav-config";

export function getProjectInitials(key?: string, name?: string): string {
  if (key && key.length >= 2) return key.slice(0, 2).toUpperCase();
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return "PR";
}

export function ProjectNavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: ProjectNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      {...animatedNavHoverHandlers}
      className={cn(
        "group/nav relative flex items-center rounded-lg text-[13px] font-medium",
        "transition-[color,background-color,box-shadow,transform] duration-150 ease-out",
        collapsed ? "mx-auto justify-center p-1.5" : "px-2.5 py-1.5",
        active
          ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px] shadow-primary/15"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_10px] shadow-primary/60" />
      ) : null}
      <SidebarAnimatedNavIcon
        icon={Icon}
        iconRef={iconRef}
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-150",
          active ? "text-primary" : "group-hover/nav:scale-105",
          !collapsed && "mr-2",
        )}
      />
      {!collapsed ? <span className="truncate tracking-tight">{item.label}</span> : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
