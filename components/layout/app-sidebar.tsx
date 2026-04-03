"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useGetOrganizations } from "@/lib/hooks/auth-hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useChatUnreadTotal } from "@/lib/api/hooks/chat";
import { getNavGroupsForRole } from "./sidebar/sidebar-nav-items";
import { SidebarSection } from "./sidebar/sidebar-section";
import { SidebarUserMenu } from "./sidebar/sidebar-user-menu";

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
  const unreadChatCount =
    typeof chatUnread === "number" ? chatUnread : 0;

  useEffect(() => {
    const base = "Vaivamm CRM";
    document.title =
      unreadChatCount > 0 ? `(${unreadChatCount}) ${base}` : base;
  }, [unreadChatCount]);

  const orgName = organizations?.[0]?.name;

  /* ── Loading skeleton ── */
  if (
    !hasEverLoadedRef.current &&
    (status === "loading" ||
      (status === "authenticated" && !role))
  ) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="px-3 py-4 flex-1 space-y-6">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="h-7 w-7 rounded-lg bg-sidebar-border" />
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
          "flex flex-col h-full bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
          isCollapsed ? "w-[3.5rem]" : "w-[17rem]"
        )}
      >
        {/* ── Top: Logo + collapse toggle ── */}
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
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="relative h-7 w-7 rounded-lg overflow-hidden bg-gold/10 ring-1 ring-gold/20 shrink-0">
                <Image
                  src="/logo.svg"
                  alt="Vaivamm"
                  fill
                  className="object-contain p-0.5"
                />
              </div>
              <div className="min-w-0">
                <span className="gold-text text-[0.9375rem] font-bold tracking-tight leading-none block">
                  Vaivamm
                </span>
                {orgName && (
                  <span className="text-[10px] text-sidebar-foreground/35 truncate block mt-0.5 leading-none max-w-[120px]">
                    {orgName}
                  </span>
                )}
              </div>
            </Link>
          )}

          {isCollapsed && (
            <Link
              href="/dashboard"
              onClick={onNavigate}
              className="h-7 w-7 rounded-lg overflow-hidden bg-gold/10 ring-1 ring-gold/20 flex items-center justify-center"
              aria-label="Go to dashboard"
            >
              <Image src="/logo.svg" alt="Vaivamm" width={20} height={20} className="object-contain" />
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

        {/* Expand button — only in collapsed mode */}
        {onToggleCollapse && isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="absolute -right-3 top-[3.25rem] z-10 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground/90 transition-colors"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {/* ── Navigation ── */}
        <ScrollArea className="flex-1 min-h-0">
          <nav
            className={cn(
              "py-3",
              isCollapsed ? "px-1.5" : "px-3"
            )}
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

        {/* ── User menu ── */}
        <SidebarUserMenu isCollapsed={isCollapsed} isAdmin={isAdmin} />
      </div>
    </TooltipProvider>
  );
}
