"use client";

import type { ReactNode } from "react";
import type { ShellVariant } from "@/lib/shell-variant";
import { SearchIcon } from "@animateicons/react/lucide";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { HeaderBrand } from "./header-brand";
import { ProductSwitcherMenu } from "./product-switcher-menu";
import { WorkspaceSwitcher } from "./org-switcher";
import { QuickCreateButton } from "./quick-create-button";
import { UserAvatarMenu } from "./user-avatar-menu";
import { SidebarCollapseToggle } from "./sidebar-collapse-toggle";
import { useAfterLoad } from "@/hooks/common/use-after-load";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

function SearchButton({ compact = false }: { compact?: boolean }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

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
      {...hoverHandlers}
      aria-label="Search (⌘K)"
      className={cn(
        "group flex items-center justify-center overflow-hidden rounded-lg border border-sidebar-border text-sidebar-foreground/70 outline-none transition-[color,background-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:bg-sidebar-accent hover:text-sidebar-foreground hover:shadow-sm focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transform-none motion-reduce:transition-none",
        compact ? "size-9 shrink-0" : "h-8 w-full min-w-0 max-w-full gap-2 px-3",
      )}
    >
      <SearchIcon ref={iconRef} size={16} className="shrink-0" />
      {!compact ? (
        <>
          <span className="min-w-0 flex-1 truncate text-left text-xs">Search…</span>
          <kbd className="hidden h-4 shrink-0 items-center rounded border border-sidebar-border bg-sidebar px-1 font-mono text-micro text-sidebar-foreground/65 lg:inline-flex">
            ⌘K
          </kbd>
        </>
      ) : null}
    </button>
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
  notificationBellSlot,
}: {
  isSidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
  showSidebarToggle: boolean;
  hideAdminChrome?: boolean;
  notificationBellSlot?: ReactNode;
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

      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-1">
        {!hideAdminChrome && (
          <>
            <QuickCreateButton />
          </>
        )}

        {afterLoad ? (notificationBellSlot ?? null) : <NotificationBellPlaceholder />}

        <div className="w-px h-4 bg-sidebar-border mx-1" />

        <UserAvatarMenu />
      </div>
    </div>
  );
}

function MobileHeader({
  hidden,
  hideAdminChrome,
  notificationBellSlot,
}: {
  hidden?: boolean;
  hideAdminChrome?: boolean;
  notificationBellSlot?: ReactNode;
}) {
  const afterLoad = useAfterLoad();
  return (
    <div
      className={cn(
        "flex items-center justify-between h-full w-full gap-2 px-3 sm:px-4 min-w-0",
        hidden && "invisible pointer-events-none",
      )}
      aria-hidden={hidden}
    >
      <div className="min-w-0 max-w-[9rem] shrink">
        <HeaderBrand />
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-1">
        <div
          id="mobile-header-checklist-slot"
          className="relative inline-flex items-center"
        />
        <SearchButton compact />
        {!hideAdminChrome ? <QuickCreateButton compact /> : null}
        {afterLoad ? (notificationBellSlot ?? null) : <NotificationBellPlaceholder />}
        <div className="mx-1 h-4 w-px bg-sidebar-border" />
        <UserAvatarMenu />
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
  shellVariant = "desktop",
  notificationBellSlot,
}: {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
  mobileNavOpen?: boolean;
  hideAdminChrome?: boolean;
  shellVariant?: ShellVariant;
  notificationBellSlot?: ReactNode;
}) {
  return (
    <header className="relative z-40 h-14 shrink-0 border-b border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-sm backdrop-blur-xl">
      <TooltipProvider>
        {shellVariant === "desktop" && (
          <div className="hidden md:block h-full">
            <DesktopHeader
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={onToggleSidebar}
              showSidebarToggle={showSidebarToggle}
              hideAdminChrome={hideAdminChrome}
              notificationBellSlot={notificationBellSlot}
            />
          </div>
        )}
        <div className={shellVariant === "desktop" ? "md:hidden h-full" : "h-full"}>
          <MobileHeader
            hidden={mobileNavOpen}
            hideAdminChrome={hideAdminChrome}
            notificationBellSlot={notificationBellSlot}
          />
        </div>
      </TooltipProvider>
    </header>
  );
}
