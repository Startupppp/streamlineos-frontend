"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { ShellVariant } from "@/lib/shell-variant";
import type { LucideIcon } from "lucide-react";
import { Search, CalendarDays, MessageSquare } from "lucide-react";
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
      <kbd className="hidden shrink-0 lg:inline-flex h-4 items-center rounded border border-sidebar-border bg-sidebar px-1 font-mono text-micro text-sidebar-foreground/65">
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
    <Link
      href={href}
      className="size-8 rounded-lg flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      aria-label={label}
      title={label}
    >
      {children}
    </Link>
  );
}

export interface HeaderIconLinkItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const HEADER_ICON_LINKS: HeaderIconLinkItem[] = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

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

      <div className="flex items-center gap-1 shrink-0">
        {HEADER_ICON_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <HeaderIconLink key={link.href} href={link.href} label={link.label}>
              <Icon className="h-4 w-4" />
            </HeaderIconLink>
          );
        })}

        {afterLoad ? (notificationBellSlot ?? null) : <NotificationBellPlaceholder />}

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

function MobileHeader({ hidden, notificationBellSlot }: { hidden?: boolean; notificationBellSlot?: ReactNode }) {
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
        {afterLoad ? (notificationBellSlot ?? null) : <NotificationBellPlaceholder />}
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
    <header className="h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground shrink-0 z-40 relative">
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
          <MobileHeader hidden={mobileNavOpen} notificationBellSlot={notificationBellSlot} />
        </div>
      </TooltipProvider>
    </header>
  );
}
