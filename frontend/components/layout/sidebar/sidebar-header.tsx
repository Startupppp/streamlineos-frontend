"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SidebarHeaderProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  showCollapseToggle?: boolean
}

export function SidebarHeader({
  isCollapsed = false,
  onToggleCollapse,
  showCollapseToggle = true,
}: SidebarHeaderProps) {
  const logoLink = (
    <Link
      href="/dashboard"
      className={cn(
        "rounded-lg overflow-hidden shrink-0 hover:opacity-80 transition-opacity flex items-center justify-center",
        isCollapsed ? "h-6 w-6" : "h-8 w-8",
      )}
      aria-label="StreamlineOS home"
    >
      <Image
        src="/logo.svg"
        alt=""
        width={isCollapsed ? 24 : 32}
        height={isCollapsed ? 24 : 32}
        className="object-contain"
      />
    </Link>
  )

  return (
    <div
      className={cn(
        "relative flex shrink-0 h-14 border-b border-sidebar-border items-center",
        isCollapsed ? "justify-between px-1.5" : "gap-2 px-2.5",
      )}
    >
      {isCollapsed ? (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{logoLink}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
            StreamlineOS
          </TooltipContent>
        </Tooltip>
      ) : (
        <>
          {logoLink}
          <div className="flex-1 min-w-0" />
        </>
      )}

      {showCollapseToggle && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "shrink-0 rounded-md border border-sidebar-border bg-sidebar-accent/60 shadow-sm flex items-center justify-center text-sidebar-foreground/70 hover:text-blue-600 hover:border-blue-500/40 hover:bg-sidebar-accent transition-colors",
            isCollapsed ? "h-5 w-5" : "h-6 w-6",
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  )
}
