"use client"

import { WorkspaceSwitcher } from "../header/workspace-switcher"
import { cn } from "@/lib/utils"

interface SidebarWorkspaceRowProps {
  isCollapsed?: boolean
  triggerOnly?: boolean
  onRequestOpen?: () => void
}

export function SidebarWorkspaceRow({
  isCollapsed = false,
  triggerOnly = false,
  onRequestOpen,
}: SidebarWorkspaceRowProps) {
  return (
    <div
      className={cn(
        "shrink-0 min-w-0 border-b border-sidebar-border",
        isCollapsed ? "flex justify-center px-1 py-2" : "px-2.5 py-2",
      )}
    >
      <WorkspaceSwitcher
        variant="sidebar"
        iconOnly={isCollapsed}
        className={isCollapsed ? undefined : "w-full"}
        triggerOnly={triggerOnly}
        onRequestOpen={onRequestOpen}
      />
    </div>
  )
}
