"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { CommandPalette } from "./command-palette";
import { ScrollArea } from "../ui/scroll-area";
import { NotActivatedPage } from "../auth/not-activated-page";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePushSubscription } from "@/hooks/use-push-subscription";

const SIDEBAR_COOKIE = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_W = "3.5rem";   // 56px
const SIDEBAR_EXPANDED_W  = "17rem";    // 272px

function setSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface DashboardShellProps {
  hasDashboardAccess: boolean;
  defaultCollapsed: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  hasDashboardAccess,
  defaultCollapsed,
  children,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();
  const isMobile = useIsMobile();
  usePushSubscription();

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarCookie(next);
      return next;
    });
  }, []);

  // Pages that take full viewport height and manage their own scroll
  const isProjectPage =
    pathname?.startsWith("/projects/") && pathname.split("/").length > 2;
  const isCrmDetailPage =
    pathname?.startsWith("/crm/leads/") ||
    pathname?.startsWith("/crm/deals/");
  const isChatPage = pathname === "/chat";
  const isFullHeightPage = isProjectPage || isChatPage || isCrmDetailPage;

  const sidebarW = isSidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Skip to content */}
      <Link
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </Link>

      {/* ── Fixed sidebar ── */}
      {hasDashboardAccess && !isMobile && (
        <aside
          aria-label="Sidebar"
          style={{ width: sidebarW }}
          className="hidden md:flex flex-col h-screen border-r border-sidebar-border bg-sidebar shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden relative z-30"
        >
          <AppSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        </aside>
      )}

      {/* ── Main content column ── */}
      <main
        id="dashboard-content"
        className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden"
      >
        {hasDashboardAccess ? (
          <>
            <CommandPalette />

            {/* Header — not shown on full-height pages */}
            {!isFullHeightPage && <DashboardHeader />}

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {isFullHeightPage ? (
                /* Full-height: page manages its own scroll */
                <div className="h-full w-full overflow-auto">
                  {children}
                </div>
              ) : (
                /* Normal: outer scroll, no default padding (PageWrapper adds it) */
                <ScrollArea className="h-full w-full">
                  <div className="min-h-full">
                    {children}
                  </div>
                </ScrollArea>
              )}
            </div>
          </>
        ) : (
          <NotActivatedPage />
        )}
      </main>
    </div>
  );
}
