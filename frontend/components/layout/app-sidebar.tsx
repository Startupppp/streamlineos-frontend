"use client";

import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronUp,
  User,
  Key,
  Palette,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  useGetOrganizations,
  useSwitchOrg,
  useSignOut,
} from "@/hooks/common/auth-hooks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePendingApprovals } from "@/hooks/api/dashboard";
import { useChatUnreadTotal } from "@/hooks/api/chat";
import { useUnreadNotificationCount } from "@/hooks/api/notifications";
import {
  getNavGroupsForProduct,
  getProductFromPathname,
  flattenNavRoutes,
} from "./sidebar/sidebar-nav-items";
import { SidebarSection } from "./sidebar/sidebar-section";
import { usePermissions } from "@/lib/rbac/hooks";
import { useCan } from "@/hooks/api/access";

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
  const switchOrg = useSwitchOrg();
  const { mutate: signOut, isPending: isSigningOut } = useSignOut();

  function handleSignOut() {
    signOut();
  }
  const role = session?.user?.role;
  const isOrgOwner =
    session?.user?.isOrgOwner === true ||
    session?.user?.isPlatformAdmin === true;

  const lastKnownRoleRef = useRef<string | undefined>(role);
  if (role) lastKnownRoleRef.current = role;
  const rawRole = role || lastKnownRoleRef.current;
  const effectiveRole = isOrgOwner ? "OWNER" : rawRole;

  const pathname = usePathname();
  const activeProduct = getProductFromPathname(pathname);

  const { permissions } = usePermissions();
  const isAdmin = useCan("settings:manage");

  const navGroups = useMemo(
    () => getNavGroupsForProduct(activeProduct, effectiveRole, permissions),
    [activeProduct, effectiveRole, permissions],
  );

  const activeGroupLabel = useMemo(() => {
    for (const group of navGroups) {
      const match = flattenNavRoutes(group.routes).some((route) => {
        if (route.isProjectsList) return pathname.startsWith("/projects/");
        return pathname === route.href || pathname.startsWith(route.href + "/");
      });
      if (match) return group.label;
    }
    return null;
  }, [navGroups, pathname]);

  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sidebar-groups");
      if (stored)
        setCollapsedGroups(JSON.parse(stored) as Record<string, boolean>);
    } catch {}
  }, []);

  useEffect(() => {
    if (!activeGroupLabel) return;
    setCollapsedGroups((prev) => {
      if (prev[activeGroupLabel] === false) return prev;
      const next = { ...prev, [activeGroupLabel]: false };
      try {
        localStorage.setItem("sidebar-groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [activeGroupLabel]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem("sidebar-groups", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const { data: pendingApprovalsData } = usePendingApprovals({
    enabled: isAdmin && !!session?.user,
    refetchIntervalInBackground: false,
  });
  const pendingLeaves = pendingApprovalsData?.pendingLeaves ?? 0;

  const { data: chatUnread } = useChatUnreadTotal();
  const unreadChatCount = typeof chatUnread === "number" ? chatUnread : 0;

  const { data: notifData } = useUnreadNotificationCount();
  const unreadNotifCount = notifData?.count ?? 0;

  useEffect(() => {
    const base = "StreamlineOS";
    const total = unreadChatCount + unreadNotifCount;
    document.title =
      total > 0 ? `(${total > 99 ? "99+" : total}) ${base}` : base;
  }, [unreadChatCount, unreadNotifCount]);

  const activeOrgId = session?.orgId as string | null | undefined;
  const activeOrg =
    organizations?.find((o) => o.id === activeOrgId) ?? organizations?.[0];
  const orgName = activeOrg?.name;
  const otherOrgs = organizations?.filter((o) => o.id !== activeOrg?.id) ?? [];

  const handleSwitchOrg = useCallback(
    (orgId: string) => {
      switchOrg.mutate(orgId);
    },
    [switchOrg],
  );

  const handleSearchClick = useCallback(() => {
    const isMac = navigator.userAgent.toLowerCase().includes("mac")
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
      }),
    );
  }, []);

  const name = session?.user?.name ?? "User";
  const email = session?.user?.email ?? "";
  const image = resolveImageUrl(session?.user?.image);
  const initials = name.charAt(0).toUpperCase();
  const userRole = session?.user?.role ?? "";

  if (status === "loading") {
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
          isCollapsed ? "w-[3.5rem]" : "w-[17rem]",
        )}
      >
        {/* Header: logo + workspace */}
        <div
          className={cn(
            "relative flex items-center h-14 shrink-0 border-b border-sidebar-border overflow-hidden",
            isCollapsed ? "justify-center px-0" : "justify-between px-4",
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Link
                href="/dashboard"
                onClick={onNavigate}
                className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500/20 transition-all"
              >
                <Image
                  src="/logo.svg"
                  alt="StreamlineOS"
                  fill
                  className="object-contain p-1.5"
                />
              </Link>
              {otherOrgs.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 min-w-0 group outline-none"
                      disabled={switchOrg.isPending}
                    >
                      <div className="min-w-0 text-left">
                        <span className="text-[15px] font-bold tracking-tight leading-none block text-sidebar-foreground group-hover:opacity-90 transition-opacity">
                          StreamlineOS
                        </span>
                        <span className="text-[11px] text-sidebar-foreground/50 truncate block mt-0.5 leading-none max-w-[100px]">
                          {orgName ?? "Select org"}
                        </span>
                      </div>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/30 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem className="gap-2" disabled>
                      <Check className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-medium truncate">{orgName}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {otherOrgs.map((org) => (
                      <DropdownMenuItem
                        key={org.id}
                        className="gap-2 cursor-pointer"
                        onClick={() => handleSwitchOrg(org.id)}
                        disabled={switchOrg.isPending}
                      >
                        <span className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{org.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={onNavigate}
                  className="min-w-0 group"
                >
                  <span className="text-[15px] font-bold tracking-tight leading-none block text-sidebar-foreground group-hover:opacity-90 transition-opacity">
                    StreamlineOS
                  </span>
                  <span className="text-[11px] text-sidebar-foreground/50 truncate block mt-0.5 leading-none max-w-[120px]">
                    {orgName ?? ""}
                  </span>
                </Link>
              )}
            </div>
          )}

          {isCollapsed && (
            <>
              <Link
                href="/dashboard"
                onClick={onNavigate}
                className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center"
                aria-label="Go to dashboard"
              >
                <Image
                  src="/logo.svg"
                  alt="StreamlineOS"
                  width={26}
                  height={26}
                  className="object-contain"
                />
              </Link>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label="Expand sidebar"
                  className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-md flex items-center justify-center text-sidebar-foreground/70 hover:text-blue-600 hover:border-blue-500/40 hover:bg-sidebar transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}

          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="h-6 w-6 rounded-md flex items-center justify-center text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors shrink-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Nav groups */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className={cn("py-2", isCollapsed ? "px-1.5" : "px-3")}>
            {navGroups.map((group, i) => {
              const multiGroup = navGroups.length > 1;
              return (
                <SidebarSection
                  key={group.label}
                  group={group}
                  groupIndex={i}
                  isCollapsed={isCollapsed}
                  showLabel={multiGroup}
                  isGroupCollapsed={
                    multiGroup ? (collapsedGroups[group.label] ?? false) : false
                  }
                  onToggleGroup={
                    multiGroup ? () => toggleGroup(group.label) : undefined
                  }
                  pendingLeaves={pendingLeaves}
                  unreadChatCount={unreadChatCount}
                  onNavigate={onNavigate}
                />
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer: search + notifications */}
        <div
          className={cn(
            "border-t border-sidebar-border shrink-0",
            isCollapsed
              ? "px-1.5 py-2 flex flex-col items-center gap-1"
              : "px-3 py-2 flex items-center gap-1",
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
                    className="h-8 w-full rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={10}
                  className="z-[9999] text-xs"
                  style={{ zIndex: 9999 }}
                >
                  Search (⌘K)
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href="/notifications"
                    onClick={onNavigate}
                    aria-label="Notifications"
                    className="relative h-8 w-full rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 ring-1 ring-sidebar" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={10}
                  className="z-[9999] text-xs"
                  style={{ zIndex: 9999 }}
                >
                  Notifications
                  {unreadNotifCount > 0 ? ` (${unreadNotifCount})` : ""}
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSearchClick}
                aria-label="Search"
                className="flex-1 flex items-center gap-2 h-8 rounded-lg bg-sidebar-accent/60 border border-sidebar-border/80 px-2.5 text-sidebar-foreground/55 text-xs hover:text-sidebar-foreground/85 hover:bg-sidebar-accent hover:border-sidebar-ring/40 transition-colors"
              >
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">Search…</span>
                <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-sidebar-border bg-muted px-1 font-mono text-[9px] text-sidebar-foreground/45">
                  ⌘K
                </kbd>
              </button>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href="/notifications"
                    onClick={onNavigate}
                    aria-label="Notifications"
                    className="relative h-8 w-8 rounded-lg flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotifCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 ring-1 ring-sidebar" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={6}
                  className="text-xs z-[200]"
                >
                  Notifications
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* User profile */}
        <div
          className={cn(
            "border-t border-sidebar-border",
            isCollapsed ? "p-2" : "px-2 py-2",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "group flex items-center gap-2.5 w-full rounded-lg outline-none transition-colors duration-150",
                  "hover:bg-sidebar-accent/70 focus-visible:ring-1 focus-visible:ring-sidebar-ring",
                  isCollapsed ? "justify-center p-2" : "px-2.5 py-2",
                )}
              >
                <Avatar className="h-7 w-7 shrink-0 ring-2 ring-sidebar-border/50">
                  <AvatarImage src={image} alt={name} />
                  <AvatarFallback className="text-[11px] font-bold bg-blue-500/15 text-blue-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-sidebar-foreground/85 truncate leading-none">
                        {name}
                      </p>
                      <p className="text-xs text-sidebar-foreground/35 truncate mt-0.5 leading-none">
                        {userRole}
                      </p>
                    </div>
                    <ChevronUp className="h-3.5 w-3.5 text-sidebar-foreground/25 group-hover:text-sidebar-foreground/50 transition-colors shrink-0" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={isCollapsed ? "center" : "start"}
              side="top"
              sideOffset={6}
              className="w-56 z-[200]"
            >
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-foreground truncate">
                  {name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="gap-2 cursor-pointer" onClick={onNavigate}>
                  <User className="h-3.5 w-3.5" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="gap-2 cursor-pointer" onClick={onNavigate}>
                  <Settings className="h-3.5 w-3.5" />
                  My Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/notifications/preferences" className="gap-2 cursor-pointer" onClick={onNavigate}>
                  <Bell className="h-3.5 w-3.5" />
                  Notification Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/appearance" className="gap-2 cursor-pointer" onClick={onNavigate}>
                  <Palette className="h-3.5 w-3.5" />
                  Appearance
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/api-tokens" className="gap-2 cursor-pointer" onClick={onNavigate}>
                      <Key className="h-3.5 w-3.5" />
                      API Keys
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );
}
