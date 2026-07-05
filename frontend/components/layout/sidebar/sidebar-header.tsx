"use client"

import Link from "next/link"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface SidebarHeaderProps {
  isCollapsed?: boolean
}

export function SidebarHeader({
  isCollapsed = false,
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
        "flex shrink-0 h-14 border-b border-sidebar-border items-center overflow-visible",
        isCollapsed ? "justify-center px-1.5" : "gap-2 px-2.5",
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
          <span className="text-sm font-semibold text-sidebar-foreground truncate min-w-0">
            StreamlineOS
          </span>
        </>
      )}
    </div>
  )
}
