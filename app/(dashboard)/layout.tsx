"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "../../components/layout/app-sidebar";
import { DashboardHeader } from "../../components/layout/dashboard-header";
import { OrganizationGuard } from "../../components/auth/organization-guard";
import { ScrollArea } from "../../components/ui/scroll-area";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const isProjectPage = pathname?.startsWith("/projects/") && pathname.split("/").length > 2;

  return (
    <OrganizationGuard>
      <div className="h-screen relative bg-background overflow-hidden">
        <a
          href="#dashboard-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Skip to content
        </a>
        <div className={`hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-80 border-r bg-sidebar transition-all duration-300 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}`}>
          <AppSidebar 
            isCollapsed={isSidebarCollapsed} 
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          />
        </div>
        <main id="dashboard-content" className={`h-screen flex flex-col overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-72'}`}>
          {!isProjectPage && <DashboardHeader />}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {isProjectPage ? (
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
        </main>
      </div>
    </OrganizationGuard>
  );
}
