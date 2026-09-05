"use client";
import dynamic from "next/dynamic";

import Link from "next/link";
import { Search, CalendarDays, MessageSquare } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HeaderBrand } from "./header-brand";
import { ProductSwitcherMenu } from "./product-switcher-menu";
import { WorkspaceSwitcher } from "./org-switcher";
import { PmWorkspaceContextChip } from "./pm-workspace-context-chip";
import { QuickCreateButton } from "./quick-create-button";
import { UserAvatarMenu } from "./user-avatar-menu";
import { SidebarCollapseToggle } from "./sidebar-collapse-toggle";
import { useAfterLoad } from "@/hooks/common/use-after-load";
import { useIsDesktopViewport } from "@/hooks/common/use-mobile";
const NotificationBell = dynamic(
  () =>
    import("@/features/notifications/notification-bell").then(
      (m) => m.NotificationBell,
    ),
  { ssr: false },
);

function SearchButton() {
  function handleClick() {
    const isMac = navigator.userAgent.toLowerCase().includes("mac");
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Search (⌘K)"
      className="flex min-w-0 w-full max-w-full items-center gap-2 overflow-hidden h-8 px-3 rounded-lg border border-sidebar-border text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-[color,background-color]"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left text-xs">Search…</span>
      <kbd className="hidden shrink-0 lg:inline-flex h-4 items-center rounded border border-sidebar-border bg-sidebar px-1 font-mono text-micro text-sidebar-foreground/50">
        ⌘K
      </kbd>
    </button>
  );
}

function HeaderIconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className="size-8 rounded-lg flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          aria-label={label}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function NotificationBellPlaceholder() {
  return <div className="size-8 rounded-lg shrink-0" aria-hidden="true" />;
}

function DesktopHeader({
  isSidebarCollapsed,
  onToggleSidebar,
  showSidebarToggle,
  hideAdminChrome = false,
}: {
  isSidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
  showSidebarToggle: boolean;
  hideAdminChrome?: boolean;
}) {
  const afterLoad = useAfterLoad();
  const showLabels = !isSidebarCollapsed || !showSidebarToggle;

  return (
    <div className="flex items-center h-full w-full px-4 gap-3">
      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        <HeaderBrand showLabel={showLabels} />
        {!hideAdminChrome && (
          <>
            <ProductSwitcherMenu />
            {showSidebarToggle && onToggleSidebar && (
              <SidebarCollapseToggle
                isCollapsed={isSidebarCollapsed}
                onToggle={onToggleSidebar}
              />
            )}
            <div className="w-px h-4 bg-sidebar-border" />
            <WorkspaceSwitcher variant="header" />
            <PmWorkspaceContextChip />
          </>
        )}
        {hideAdminChrome && showSidebarToggle && onToggleSidebar && (
          <SidebarCollapseToggle
            isCollapsed={isSidebarCollapsed}
            onToggle={onToggleSidebar}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 justify-center px-4">
        <div className="w-full min-w-0 max-w-xs">
          <SearchButton />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <HeaderIconLink href="/calendar" label="Calendar">
          <CalendarDays className="h-4 w-4" />
        </HeaderIconLink>

        <HeaderIconLink href="/chat" label="Chat">
          <MessageSquare className="h-4 w-4" />
        </HeaderIconLink>

        {afterLoad ? <NotificationBell /> : <NotificationBellPlaceholder />}

        {!hideAdminChrome && (
          <>
            <div className="w-px h-4 bg-sidebar-border mx-1" />
            <QuickCreateButton />
          </>
        )}

        <div className="w-px h-4 bg-sidebar-border mx-1" />

        <UserAvatarMenu />
      </div>
    </div>
  );
}

function MobileHeader({ hidden }: { hidden?: boolean }) {
  const afterLoad = useAfterLoad();
  return (
    <div
      className={cn(
        "flex items-center justify-between h-full w-full gap-2 px-3 sm:px-4 min-w-0",
        hidden && "invisible pointer-events-none",
      )}
      aria-hidden={hidden}
    >
      <div className="min-w-0 shrink">
        <HeaderBrand />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div
          id="mobile-header-checklist-slot"
          className="relative inline-flex items-center"
        />
        {afterLoad ? <NotificationBell /> : <NotificationBellPlaceholder />}
      </div>
    </div>
  );
}

export function GlobalHeader({
  isSidebarCollapsed = false,
  onToggleSidebar,
  showSidebarToggle = true,
  mobileNavOpen = false,
  hideAdminChrome = false,
}: {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
  mobileNavOpen?: boolean;
  hideAdminChrome?: boolean;
}) {
  const isDesktop = useIsDesktopViewport();
  return (
    <header className="h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0 z-40 relative">
      <TooltipProvider>
        {isDesktop && (
          <div className="hidden md:block h-full">
            <DesktopHeader
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={onToggleSidebar}
              showSidebarToggle={showSidebarToggle}
              hideAdminChrome={hideAdminChrome}
            />
          </div>
        )}
        <div className="md:hidden h-full">
          <MobileHeader hidden={mobileNavOpen} />
        </div>
      </TooltipProvider>
    </header>
  );
}
