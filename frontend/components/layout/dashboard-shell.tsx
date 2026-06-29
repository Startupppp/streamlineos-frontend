"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { AppSidebar } from "./app-sidebar"
import { TopHeader } from "./top-header"
import { ProductSwitcher } from "./product-switcher"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { CommandPalette } from "./command-palette"
import { NotActivatedPage } from "../auth/not-activated-page"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/common/use-mobile"
import { usePushSubscription } from "@/hooks/common/use-push-subscription"
import { TrialBanner } from "@/components/billing/trial-banner"

const SuccessChecklist = dynamic(
  () =>
    import("@/components/workspace-onboarding/success-checklist").then(
      (m) => m.SuccessChecklist,
    ),
  { ssr: false },
)

const ChatUnreadNotifications = dynamic(
  () =>
    import("@/components/chat/chat-unread-notifications").then(
      (m) => m.ChatUnreadNotifications,
    ),
  { ssr: false },
)

const SIDEBAR_COOKIE = "sidebar-collapsed"
const SIDEBAR_COLLAPSED_W = "3.5rem"
const SIDEBAR_EXPANDED_W = "15rem"

function setSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

interface DashboardShellProps {
  userId: string
  hasDashboardAccess: boolean
  defaultCollapsed: boolean
  children: React.ReactNode
}

export function DashboardShell({
  userId,
  hasDashboardAccess,
  defaultCollapsed,
  children,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(defaultCollapsed)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()
  usePushSubscription(userId)

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      setSidebarCookie(next)
      return next
    })
  }, [])

  const handleOpenMobileMenu = useCallback(() => setMobileMenuOpen(true), [])
  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  const sidebarW = isSidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {hasDashboardAccess && <ChatUnreadNotifications currentUserId={userId} />}
      <Link
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </Link>

      {hasDashboardAccess ? (
        <>
          <TopHeader onMobileMenuOpen={handleOpenMobileMenu} />
          <div className="hidden md:block">
            <ProductSwitcher />
          </div>
          <CommandPalette />
          <TrialBanner />

          <div className="flex-1 flex overflow-hidden">
            {!isMobile && (
              <aside
                aria-label="Sidebar"
                style={{ width: sidebarW }}
                className="hidden md:flex flex-col h-full border-r border-sidebar-border bg-sidebar shrink-0 transition-[width] duration-300 ease-in-out overflow-visible relative z-30"
              >
                <AppSidebar
                  isCollapsed={isSidebarCollapsed}
                  onToggleCollapse={handleToggleSidebar}
                />
              </aside>
            )}

            <main
              id="dashboard-content"
              className="flex-1 min-w-0 flex flex-col overflow-hidden"
            >
              <div className="flex-1 min-h-0 overflow-auto flex flex-col pb-16 md:pb-0">
                {children}
              </div>
              <SuccessChecklist />
            </main>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} modal>
            <SheetContent side="left" className="z-[100] p-0 w-[15rem] border-r-sidebar-border">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <AppSidebar onNavigate={handleCloseMobileMenu} />
            </SheetContent>
          </Sheet>

          <MobileBottomNav />
        </>
      ) : (
        <NotActivatedPage />
      )}
    </div>
  )
}
