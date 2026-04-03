"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { CommandPalette } from "./command-palette";
import { ScrollArea } from "../ui/scroll-area";
import { NotActivatedPage } from "../auth/not-activated-page";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  const matchRef = useRef(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      matchRef.current = e.matches;
      setMatches(e.matches);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

interface DashboardShellProps {
  hasDashboardAccess: boolean;
  children: React.ReactNode;
}

export function DashboardShell({ hasDashboardAccess, children }: DashboardShellProps) {
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const [isSidebarManuallyToggled, setIsSidebarManuallyToggled] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isSidebarManuallyToggled) {
      setIsSidebarCollapsed(isTablet);
    }
  }, [isTablet, isSidebarManuallyToggled]);

  const handleToggleSidebar = () => {
    setIsSidebarManuallyToggled(true);
    setIsSidebarCollapsed((prev) => !prev);
  };

  const isProjectPage = pathname?.startsWith("/projects/") && pathname.split("/").length > 2;
  const isCrmDetailPage = pathname?.startsWith("/crm/leads/") || pathname?.startsWith("/crm/deals/");
  const isChatPage = pathname === "/chat";
  const isFullHeightPage = isProjectPage || isChatPage || isCrmDetailPage;

  return (
    <div className="h-screen relative bg-background overflow-hidden">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to content
      </a>
      {hasDashboardAccess && (
        <div className={`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-80 border-r bg-sidebar transition-all duration-300 ${isSidebarCollapsed ? "md:w-20" : "md:w-72"}`}>
          <AppSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
          />
        </div>
      )}
      <main
        id="dashboard-content"
        className={`h-screen flex flex-col overflow-hidden transition-all duration-300 ${hasDashboardAccess ? (isSidebarCollapsed ? "md:pl-20" : "md:pl-72") : ""}`}
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
