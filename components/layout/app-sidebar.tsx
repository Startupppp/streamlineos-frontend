"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatUnreadTotal } from "@/lib/api/hooks/chat";
import { getNavGroupsForRole } from "./sidebar/sidebar-nav-items";
import { SidebarSection } from "./sidebar/sidebar-section";
import { SidebarUserMenu } from "./sidebar/sidebar-user-menu";

interface AppSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AppSidebar({ isCollapsed = false, onToggleCollapse, onNavigate }: AppSidebarProps) {
  const { data: session, status } = useSession();
  const { data: organizations } = useGetOrganizations();
  const role = session?.user?.role;

  // Preserve last known role so sidebar doesn't flash skeleton during transient session refreshes
  const lastKnownRoleRef = useRef<string | undefined>(role);
  const hasEverLoadedRef = useRef(false);
  if (role) {
    lastKnownRoleRef.current = role;
    hasEverLoadedRef.current = true;
  }
  const effectiveRole = role || lastKnownRoleRef.current;

  const navGroups = useMemo(() => getNavGroupsForRole(effectiveRole), [effectiveRole]);
  const isAdmin = effectiveRole === "CEO" || effectiveRole === "HR";

  const [pendingLeaves, setPendingLeaves] = useState(0);
  useEffect(() => {
    if (!isAdmin || !session?.user) return;
    let cancelled = false;
    async function fetchCounts() {
      try {
        const { getPendingApprovalCount } = await import("@/server/actions/leave-actions");
        const leavesCount = await getPendingApprovalCount();
        if (!cancelled) setPendingLeaves(leavesCount);
      } catch {
        // Leave count fetch failed — default to 0
        if (!cancelled) setPendingLeaves(0);
      }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session, isAdmin]);

  const { data: chatUnread } = useChatUnreadTotal();
  const unreadChatCount = typeof chatUnread === "number" ? chatUnread : 0;

  // Update browser tab title with unread count
  useEffect(() => {
    const baseTitle = "Vaivamm CRM";
    document.title = unreadChatCount > 0 ? `(${unreadChatCount}) ${baseTitle}` : baseTitle;
  }, [unreadChatCount]);

  // Only show skeleton on very first load, never during navigation
  if (!hasEverLoadedRef.current && (status === "loading" || (status === "authenticated" && !role))) {
    return (
      <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-4 flex-1">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
          <div className="px-2 mb-6">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "px-4 py-4 flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={onNavigate}>
          <div className="relative w-8 h-8 bg-card rounded-lg border border-gold/20 flex items-center justify-center overflow-hidden shadow-noir shrink-0">
            <Image src="/logo.svg" alt="Vaivamm Logo" width={28} height={28} className="rounded" />
          </div>
          {!isCollapsed && (
            <h1 className="text-xl font-bold font-serif gold-text truncate">Vaivamm</h1>
          )}
        </Link>
        {onToggleCollapse && !isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 shrink-0 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {onToggleCollapse && isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="absolute -right-3 top-5 z-10 h-6 w-6 rounded-full border bg-sidebar shadow-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Organisation badge */}
      {organizations && organizations.length > 0 && !isCollapsed && (
        <div className="px-4 mb-4">
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-sidebar-border bg-sidebar-accent/30 h-10">
            <Building2 className="h-4 w-4 text-sidebar-foreground/60 shrink-0" />
            <span className="truncate text-sm text-sidebar-foreground">
              {organizations[0]?.name || "Organization"}
            </span>
          </div>
        </div>
      )}

      {/* Decorative divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className={cn("pb-4 pt-2", isCollapsed ? "px-2" : "px-3")}>
          {navGroups.map((group, groupIndex) => (
            <SidebarSection
              key={group.label}
              group={group}
              groupIndex={groupIndex}
              isCollapsed={isCollapsed}
              pendingLeaves={pendingLeaves}
              unreadChatCount={unreadChatCount}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* User menu */}
      <SidebarUserMenu isCollapsed={isCollapsed} isAdmin={isAdmin} />
    </div>
  );
}
