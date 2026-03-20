"use client";

import { useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { DashboardHeader } from "../../components/layout/dashboard-header";
import { OrganizationGuard } from "../../components/auth/organization-guard";
import { ScrollArea } from "../../components/ui/scroll-area";
import { NotActivatedPage } from "../../components/auth/not-activated-page";
import { CommandPalette } from "../../components/layout/command-palette";
import { AISidebar } from "../../components/shared/ai-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isProjectPage = pathname?.startsWith("/projects/") && pathname.split("/").length > 2;
  const isCrmDetailPage = pathname?.startsWith("/crm/leads/") || pathname?.startsWith("/crm/deals/");
  const isChatPage = pathname === "/chat";
  const isFullHeightPage = isProjectPage || isChatPage || isCrmDetailPage;

  const role = session?.user?.role;
  const isAdminRole = role === "CEO" || role === "HR";

  // Track whether we've ever successfully loaded session data.
  // Once authenticated, preserve access during transient session refreshes
  // to prevent the dashboard from flickering/disappearing on navigation.
  const lastKnownAccessRef = useRef<boolean>(true);
  const hasEverLoadedRef = useRef(false);

  if (status === "authenticated" && role) {
    hasEverLoadedRef.current = true;
    lastKnownAccessRef.current = isAdminRole || session?.user?.hasDashboardAccess !== false;
  }

  // Use last known good state during loading/transient states
  const hasDashboardAccess =
    status === "authenticated" && role
      ? isAdminRole || session?.user?.hasDashboardAccess !== false
      : hasEverLoadedRef.current
        ? lastKnownAccessRef.current
        : true; // First load: assume access, sidebar shows skeleton

  return (
    <OrganizationGuard>
      <div className="h-screen relative bg-background overflow-hidden">
        <a
          href="#dashboard-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Skip to content
        </a>
        {hasDashboardAccess && (
          <div className={`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-80 border-r bg-sidebar transition-all duration-300 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>
            <AppSidebar
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>
        )}
        <main id="dashboard-content" className={`h-screen flex flex-col overflow-hidden transition-all duration-300 ${hasDashboardAccess ? (isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72') : ''}`}>
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
                  <ScrollArea className="h-full w-full" style={{ overflowX: 'auto' }}>
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
        {hasDashboardAccess && <AISidebar />}
      </div>
    </OrganizationGuard>
  );
}
