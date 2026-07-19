"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AppSidebar } from "./app-sidebar";
import { GlobalHeader } from "./header/global-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { CommandPalette } from "./command-palette";
import { NotActivatedPage } from "../auth/not-activated-page";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePushSubscription } from "@/hooks/common/use-push-subscription";
import { TrialBanner } from "@/components/billing/trial-banner";
import { ProductSwitcherMenu } from "./header/product-switcher-menu";
import { WorkspaceSwitcher } from "./header/workspace-switcher";
import { useProductSidebarVisibility } from "./sidebar/use-product-sidebar-visibility";
import { AskOsProvider } from "@/components/assistant/ask-os-provider";
import { CommandPaletteProvider } from "@/features/command-palette";

const SuccessChecklist = dynamic(
  () =>
    import("@/components/workspace-onboarding/success-checklist").then(
      (m) => m.SuccessChecklist,
    ),
  { ssr: false },
);

const WelcomeToast = dynamic(
  () =>
    import("@/components/workspace-onboarding/welcome-toast").then(
      (m) => m.WelcomeToast,
    ),
  { ssr: false },
)

const ChatUnreadNotifications = dynamic(
  () =>
    import("@/components/chat/chat-unread-notifications").then(
      (m) => m.ChatUnreadNotifications,
    ),
  { ssr: false },
);

const SIDEBAR_COOKIE = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_W = "3.5rem";
const SIDEBAR_EXPANDED_W = "17rem";

function setSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface DashboardShellProps {
  userId: string;
  hasDashboardAccess: boolean;
  defaultCollapsed: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  userId,
  hasDashboardAccess,
  defaultCollapsed,
  children,
}: DashboardShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(defaultCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productSwitcherOpen, setProductSwitcherOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const { hideSidebar } = useProductSidebarVisibility();
  usePushSubscription(userId);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      setSidebarCookie(next);
      return next;
    });
  }, []);

  const handleOpenMobileMenu = useCallback(() => {
    if (hideSidebar) {
      setProductSwitcherOpen(true);
      return;
    }
    setMobileMenuOpen(true);
  }, [hideSidebar]);
  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const deferCloseMobileMenu = useCallback(() => {
    if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      setMobileMenuOpen(false);
    });
  }, []);

  const handleRequestProductSwitcher = useCallback(() => {
    setProductSwitcherOpen(true);
    deferCloseMobileMenu();
  }, [deferCloseMobileMenu]);

  const handleRequestWorkspaceSwitcher = useCallback(() => {
    setWorkspaceSwitcherOpen(true);
    deferCloseMobileMenu();
  }, [deferCloseMobileMenu]);

  const sidebarW = isSidebarCollapsed
    ? SIDEBAR_COLLAPSED_W
    : SIDEBAR_EXPANDED_W;

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {hasDashboardAccess && <ChatUnreadNotifications currentUserId={userId} />}
      <Link
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </Link>

      {hasDashboardAccess ? (
        <CommandPaletteProvider>
          <AskOsProvider>
            <CommandPalette />
            <TrialBanner />

            <GlobalHeader
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              showSidebarToggle={!hideSidebar}
            />

            <div className="flex-1 flex min-h-0">
              {!hideSidebar && (
                <aside
                  aria-label="Sidebar"
                  style={{ width: sidebarW }}
                  className="hidden md:flex flex-col h-full border-r border-sidebar-border bg-sidebar shrink-0 transition-[width] duration-300 ease-in-out overflow-visible relative z-50"
                >
                  <AppSidebar isCollapsed={isSidebarCollapsed} />
                </aside>
              )}

              <main
                id="dashboard-content"
                className="flex-1 min-w-0 flex flex-col overflow-hidden md:pb-6"
              >
                <div className="flex-1 min-h-0 overflow-auto flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                  {children}
                  <WelcomeToast />
                  <SuccessChecklist />
                </div>
              </main>
            </div>

            {!hideSidebar && (
              <Sheet
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
                modal
              >
                <SheetContent
                  side="left"
                  className="z-[100] p-0 w-[17rem] border-r-sidebar-border"
                >
                  <SheetTitle className="sr-only">Navigation</SheetTitle>
                  <AppSidebar
                    isMobile
                    onNavigate={handleCloseMobileMenu}
                    onRequestProductSwitcher={handleRequestProductSwitcher}
                    onRequestWorkspaceSwitcher={handleRequestWorkspaceSwitcher}
                  />
                </SheetContent>
              </Sheet>
            )}

            <ProductSwitcherMenu
              sheetOnly
              open={productSwitcherOpen}
              onOpenChange={setProductSwitcherOpen}
            />
            <WorkspaceSwitcher
              sheetOnly
              open={workspaceSwitcherOpen}
              onOpenChange={setWorkspaceSwitcherOpen}
            />

            <MobileBottomNav onOpenMobileMenu={handleOpenMobileMenu} />
          </AskOsProvider>
        </CommandPaletteProvider>
      ) : (
        <NotActivatedPage />
      )}
    </div>
  );
}
