"use client"

import { useMemo, useRef, useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TooltipProvider } from "@/components/ui/tooltip"
import { usePendingApprovals } from "@/hooks/api/dashboard"
import { useChatUnreadTotal } from "@/hooks/api/chat"
import { useUnreadNotificationCount } from "@/hooks/api/notifications"
import {
  getNavGroupsForProduct,
  getProductFromPathname,
  flattenNavRoutes,
  PRODUCT_DEFINITIONS,
  MODULE_ACCENTS,
  type ModuleAccent,
} from "./sidebar/sidebar-nav-items"
import { SidebarSection } from "./sidebar/sidebar-section"
import { SidebarHeader } from "./sidebar/sidebar-header"
import { SidebarWorkspaceRow } from "./sidebar/sidebar-workspace-row"
import { usePermissions } from "@/lib/rbac/hooks"
import { useCan } from "@/hooks/api/access"
import { useEnabledModules } from "@/hooks/api/access/org-modules"

interface AppSidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
  isMobile?: boolean
}

export function AppSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
  isMobile = false,
}: AppSidebarProps) {
  const { data: session, status } = useSession()
  const role = session?.user?.role
  const isOrgOwner =
    session?.user?.isOrgOwner === true ||
    session?.user?.isPlatformAdmin === true

  const lastKnownRoleRef = useRef<string | undefined>(role)
  if (role) lastKnownRoleRef.current = role
  const rawRole = role || lastKnownRoleRef.current
  const effectiveRole = isOrgOwner ? "OWNER" : rawRole

  const pathname = usePathname()
  const activeProduct = getProductFromPathname(pathname)
  const accent: ModuleAccent = MODULE_ACCENTS[activeProduct]

  const productLabel = useMemo(() => {
    if (activeProduct === "home") return "StreamlineOS"
    const definition = PRODUCT_DEFINITIONS.find((p) => p.key === activeProduct)
    return definition?.label ?? "StreamlineOS"
  }, [activeProduct])

  const { permissions } = usePermissions()
  const isAdmin = useCan("settings:manage")
  const enabledModules = useEnabledModules()

  const navGroups = useMemo(
    () => getNavGroupsForProduct(activeProduct, effectiveRole, permissions, enabledModules),
    [activeProduct, effectiveRole, permissions, enabledModules],
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

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-groups")
      if (stored)
        setCollapsedGroups(JSON.parse(stored) as Record<string, boolean>)
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
    document.title =
      total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base
  }, [unreadChatCount, unreadNotifCount])

  const showCollapseToggle = !isMobile && !!onToggleCollapse
  const effectiveCollapsed = isMobile ? false : isCollapsed

  function handleToggleClick() {
    onToggleCollapse?.()
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="h-14 shrink-0 border-b border-sidebar-border px-3 flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-lg bg-sidebar-border" />
          <Skeleton className="h-6 w-6 rounded-md bg-sidebar-border" />
        </div>
        <div className="shrink-0 border-b border-sidebar-border px-3 py-2">
          <Skeleton className="h-8 w-full rounded-lg bg-sidebar-border" />
        </div>
        <div className="px-3 py-4 flex-1 space-y-6">
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded bg-sidebar-border" />
                <Skeleton className="h-3.5 w-24 rounded bg-sidebar-border" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex flex-col h-full overflow-visible bg-sidebar text-sidebar-foreground",
          !isMobile && "transition-[width] duration-300 ease-in-out",
          isMobile ? "w-full" : effectiveCollapsed ? "w-[3.5rem]" : "w-[17rem]",
        )}
      >
        {showCollapseToggle && (
          <button
            type="button"
            onClick={handleToggleClick}
            aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute top-[1.75rem] -translate-y-1/2 -right-3 z-[60] h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md flex items-center justify-center text-sidebar-foreground/70 hover:text-blue-600 hover:border-blue-500/40 hover:bg-sidebar-accent transition-colors"
          >
            {effectiveCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <SidebarHeader
          isCollapsed={effectiveCollapsed}
          productLabel={productLabel}
        />

        <SidebarWorkspaceRow isCollapsed={effectiveCollapsed} />

        <ScrollArea className="flex-1 min-h-0">
          <nav className={cn("py-2", effectiveCollapsed ? "px-1" : "px-2.5")}>
            {navGroups.map((group, i) => {
              const multiGroup = navGroups.length > 1
              return (
                <SidebarSection
                  key={group.label}
                  group={group}
                  groupIndex={i}
                  isCollapsed={effectiveCollapsed}
                  showLabel={multiGroup}
                  isGroupCollapsed={
                    multiGroup ? (collapsedGroups[group.label] ?? false) : false
                  }
                  onToggleGroup={
                    multiGroup ? () => toggleGroup(group.label) : undefined
                  }
                  pendingLeaves={pendingLeaves}
                  onNavigate={onNavigate}
                  accent={accent}
                />
              )
            })}
          </nav>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
