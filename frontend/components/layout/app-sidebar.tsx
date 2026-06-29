"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import { usePendingApprovals } from "@/hooks/api/dashboard"
import { useChatUnreadTotal } from "@/hooks/api/chat"
import { useUnreadNotificationCount } from "@/hooks/api/notifications"
import {
  flattenNavRoutes,
  getNavGroupsForProduct,
  getProductFromPathname,
  PRODUCT_DEFINITIONS,
} from "./sidebar/sidebar-nav-items"
import { SidebarSection } from "./sidebar/sidebar-section"
import { usePermissions } from "@/lib/rbac/hooks"
import { useCan } from "@/hooks/api/access"
import { Skeleton } from "@/components/ui/skeleton"

interface AppSidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}

export function AppSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: AppSidebarProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const role = session?.user?.role
  const { permissions } = usePermissions()
  const isAdmin = useCan("settings:manage")

  const lastKnownRoleRef = useRef<string | undefined>(role)
  const hasEverLoadedRef = useRef(false)
  if (role) {
    lastKnownRoleRef.current = role
    hasEverLoadedRef.current = true
  }
  const effectiveRole = role || lastKnownRoleRef.current

  const activeProduct = getProductFromPathname(pathname)
  const productDef = PRODUCT_DEFINITIONS.find((p) => p.key === activeProduct)

  const navGroups = useMemo(
    () => getNavGroupsForProduct(activeProduct, effectiveRole, permissions),
    [activeProduct, effectiveRole, permissions],
  )

  const activeGroupLabel = useMemo(() => {
    for (const group of navGroups) {
      const match = flattenNavRoutes(group.routes).some((route) => {
        if (route.isProjectsList) return pathname.startsWith("/projects/")
        return pathname === route.href || pathname.startsWith(route.href + "/")
      })
      if (match) return group.label
    }
    return null
  }, [navGroups, pathname])

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-groups")
      if (stored) setCollapsedGroups(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (!activeGroupLabel) return
    setCollapsedGroups((prev) => {
      if (prev[activeGroupLabel] === false) return prev
      const next = { ...prev, [activeGroupLabel]: false }
      try {
        localStorage.setItem("sidebar-groups", JSON.stringify(next))
      } catch {}
      return next
    })
  }, [activeGroupLabel])

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] }
      try {
        localStorage.setItem("sidebar-groups", JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const { data: pendingApprovalsData } = usePendingApprovals({
    enabled: isAdmin && !!session?.user,
    refetchIntervalInBackground: false,
  })
  const pendingLeaves = pendingApprovalsData?.pendingLeaves ?? 0
  const { data: chatUnread } = useChatUnreadTotal()
  const unreadChatCount = typeof chatUnread === "number" ? chatUnread : 0
  const { data: notifData } = useUnreadNotificationCount()
  const unreadNotifCount = notifData?.count ?? 0

  useEffect(() => {
    const base = "StreamlineOS"
    const total = unreadChatCount + unreadNotifCount
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base
  }, [unreadChatCount, unreadNotifCount])

  if (status === "loading") {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="px-3 py-3 flex-1 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-1">
              <Skeleton className="h-4 w-4 rounded bg-sidebar-border" />
              <Skeleton className="h-3.5 w-24 rounded bg-sidebar-border" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex flex-col h-full bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-[3.5rem]" : "w-[15rem]",
        )}
      >
        <div
          className={cn(
            "relative flex items-center h-10 shrink-0 border-b border-sidebar-border",
            isCollapsed ? "justify-center px-0" : "justify-between px-3",
          )}
        >
          {!isCollapsed && productDef && (
            <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider truncate">
              {productDef.label}
            </span>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0",
                isCollapsed
                  ? "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  : "text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent",
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <nav className={cn("py-2", isCollapsed ? "px-1.5" : "px-2")}>
            {navGroups.length === 0 ? (
              !isCollapsed && (
                <p className="text-xs text-sidebar-foreground/40 px-2 py-4 text-center">
                  No navigation for this product.
                </p>
              )
            ) : (
              navGroups.map((group, i) => {
                const groupLabel = group.label
                const isGroupCollapsed =
                  groupLabel in collapsedGroups ? collapsedGroups[groupLabel] : true
                return (
                  <SidebarSection
                    key={groupLabel}
                    group={group}
                    groupIndex={i}
                    isCollapsed={isCollapsed}
                    isGroupCollapsed={isGroupCollapsed}
                    onToggleGroup={() => toggleGroup(groupLabel)}
                    pendingLeaves={pendingLeaves}
                    unreadChatCount={unreadChatCount}
                    onNavigate={onNavigate}
                  />
                )
              })
            )}
          </nav>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
