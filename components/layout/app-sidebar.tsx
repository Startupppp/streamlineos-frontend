"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Search, Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useChatUnreadTotal } from "@/lib/api/hooks/chat";
import { getNavGroupsForRole } from "./sidebar/sidebar-nav-items";
import { SidebarSection } from "./sidebar/sidebar-section";
import { SidebarUserMenu } from "./sidebar/sidebar-user-menu";
import { NotificationBell } from "./notification-bell";

interface AppSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AppSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: AppSidebarProps) {
  const { data: session, status } = useSession();
  const { data: organizations } = useGetOrganizations();
  const role = session?.user?.role;

  const lastKnownRoleRef = useRef<string | undefined>(role);
  const hasEverLoadedRef = useRef(false);
  if (role) {
    lastKnownRoleRef.current = role;
    hasEverLoadedRef.current = true;
  }
  const effectiveRole = role || lastKnownRoleRef.current;

  const navGroups = useMemo(
    () => getNavGroupsForRole(effectiveRole),
    [effectiveRole]
  );
  const isAdmin = effectiveRole === "CEO" || effectiveRole === "HR";

  const [pendingLeaves, setPendingLeaves] = useState(0);

  useEffect(() => {
    if (!isAdmin || !session?.user) return;
    let cancelled = false;
    async function fetchCounts() {
      try {
        const { getPendingApprovalCount } = await import(
          "@/server/actions/leave-actions"
        );
        const count = await getPendingApprovalCount();
        if (!cancelled) setPendingLeaves(count);
      } catch {
        if (!cancelled) setPendingLeaves(0);
      }
    }
    fetchCounts();
    const id = setInterval(fetchCounts, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [session, isAdmin]);

  const { data: chatUnread } = useChatUnreadTotal();
  const unreadChatCount = typeof chatUnread === "number" ? chatUnread : 0;

  useEffect(() => {
    const base = "Vaivamm CRM";
    document.title = unreadChatCount > 0 ? `(${unreadChatCount}) ${base}` : base;
  }, [unreadChatCount]);

  const orgName = organizations?.[0]?.name;

  const handleSearchClick = useCallback(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: navigator.platform?.toUpperCase().includes("MAC") ?? true,
        ctrlKey: !(navigator.platform?.toUpperCase().includes("MAC") ?? true),
        bubbles: true,
      })
    );
  }, []);

  if (
    !hasEverLoadedRef.current &&
    (status === "loading" || (status === "authenticated" && !role))
  ) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="px-3 py-4 flex-1 space-y-6">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="h-8 w-8 rounded-xl bg-sidebar-border" />
            <Skeleton className="h-4 w-20 rounded bg-sidebar-border" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="h-4 w-4 rounded bg-sidebar-border" />
                <Skeleton className="h-3.5 w-24 rounded bg-sidebar-border" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-full bg-sidebar-border" />
            <Skeleton className="h-3 w-20 rounded bg-sidebar-border" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "relative flex flex-col h-full bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-[3.5rem]" : "w-[17rem]"
        )}
      >
        <div
          className={cn(
            "flex items-center h-14 shrink-0 border-b border-sidebar-border",
            isCollapsed ? "justify-center px-0" : "justify-between px-4"
          )}
        >
          {!isCollapsed && (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="flex items-center gap-3 min-w-0 group"
            >
              <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-gold/15 ring-1 ring-gold/25 shrink-0">
                <Image
                  src="/logo.svg"
                  alt="Vaivamm"
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div className="min-w-0">
                <span className="gold-text text-base font-bold tracking-tight leading-none block group-hover:opacity-90 transition-opacity">
                  Vaivamm
                </span>
                {orgName ? (
                  <span className="text-[10px] text-sidebar-foreground/35 truncate block mt-0.5 leading-none max-w-[120px]">
                    {orgName}
                  </span>
                ) : (
                  <span className="text-[10px] text-sidebar-foreground/25 block mt-0.5 leading-none">
                    CRM Platform
                  </span>
                )}
              </div>
            </Link>
          )}

          {isCollapsed && (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="h-9 w-9 rounded-xl overflow-hidden bg-gold/15 ring-1 ring-gold/25 flex items-center justify-center"
              aria-label="Go to dashboard"
            >
              <Image
                src="/logo.svg"
                alt="Vaivamm"
                width={24}
                height={24}
                className="object-contain"
              />
            </Link>
          )}

          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="h-6 w-6 rounded-md flex items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-white/5 transition-colors shrink-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {onToggleCollapse && isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md flex items-center justify-center text-sidebar-foreground/70 hover:text-gold hover:border-gold/40 hover:bg-sidebar transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <nav
            className={cn("py-2", isCollapsed ? "px-1.5" : "px-3")}
          >
            {navGroups.map((group, i) => (
              <SidebarSection
                key={group.label}
                group={group}
                groupIndex={i}
                isCollapsed={isCollapsed}
                pendingLeaves={pendingLeaves}
                unreadChatCount={unreadChatCount}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </ScrollArea>

        <div
          className={cn(
            "border-t border-sidebar-border shrink-0",
            isCollapsed ? "px-1.5 py-2 flex flex-col items-center gap-1" : "px-3 py-2 flex items-center gap-1"
          )}
        >
          {isCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleSearchClick}
                    aria-label="Search"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/5 transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="text-xs">
                  Search (⌘K)
                </TooltipContent>
              </Tooltip>
              <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:rounded-lg [&_button]:text-sidebar-foreground/50 [&_button:hover]:text-sidebar-foreground [&_button:hover]:bg-white/[0.05]">
                <NotificationBell />
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSearchClick}
                aria-label="Search"
                className="flex-1 flex items-center gap-2 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 text-sidebar-foreground/40 text-xs hover:text-sidebar-foreground/70 hover:bg-white/[0.07] transition-colors"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">Search…</span>
                <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[9px] text-sidebar-foreground/25">
                  ⌘K
                </kbd>
              </button>
              <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:rounded-lg [&_button]:text-sidebar-foreground/50 [&_button:hover]:text-sidebar-foreground [&_button:hover]:bg-white/[0.05]">
                <NotificationBell />
              </div>
            </>
          )}
        </div>

        <SidebarUserMenu isCollapsed={isCollapsed} isAdmin={isAdmin} />
      </div>
    </TooltipProvider>
  );
}
