"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface SidebarCollapseToggleProps {
  isCollapsed: boolean
  onToggle: () => void
}

export function SidebarCollapseToggle({
  isCollapsed,
  onToggle,
}: SidebarCollapseToggleProps) {
  function handleClick() {
    onToggle()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!isCollapsed}
      className="size-8 rounded-lg flex items-center justify-center shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </button>
  )
}
