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

const SIDEBAR_COOKIE = "sidebar-collapsed";

function setSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface DashboardShellProps {
  hasDashboardAccess: boolean;
  defaultCollapsed: boolean;
  children: React.ReactNode;
}

export function DashboardShell({ hasDashboardAccess, defaultCollapsed, children }: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarCookie(next);
      return next;
    });
  }, []);

  const isProjectPage = pathname?.startsWith("/projects/") && pathname.split("/").length > 2;
  const isCrmDetailPage = pathname?.startsWith("/crm/leads/") || pathname?.startsWith("/crm/deals/");
  const isChatPage = pathname === "/chat";
  const isFullHeightPage = isProjectPage || isChatPage || isCrmDetailPage;

  const sidebarWidth = isSidebarCollapsed ? "md:w-20" : "md:w-72";
  const mainPadding = hasDashboardAccess
    ? isSidebarCollapsed ? "md:pl-20" : "md:pl-72"
    : "";

  return (
    <div className="h-screen relative bg-background overflow-hidden">
      <Link
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to content
      </Link>

      {hasDashboardAccess && !isMobile && (
        <div className={`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-80 border-r bg-sidebar transition-all duration-300 ${sidebarWidth}`}>
          <AppSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        </div>
      )}

      <main
        id="dashboard-content"
        className={`h-screen flex flex-col overflow-hidden transition-all duration-300 ${mainPadding}`}
      >
        {hasDashboardAccess ? (
          <>
            <CommandPalette />
            {!isFullHeightPage && <DashboardHeader />}
            <div className="relative flex-1 min-h-0 overflow-hidden">
              {isFullHeightPage ? (
                <div className="h-full w-full overflow-auto">
                  {children}
                </div>
              ) : (
                <ScrollArea className="h-full w-full">
                  <div className="p-4 md:p-8">
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
