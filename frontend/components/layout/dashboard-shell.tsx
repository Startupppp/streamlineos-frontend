"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { GlobalHeader } from "./header/global-header";
import { CommandPalette } from "./command-palette";
import { NotActivatedPage } from "../auth/not-activated-page";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { usePushSubscription } from "@/hooks/common/use-push-subscription";
import { TrialBanner } from "@/components/billing/trial-banner";
import { ProductSwitcherMenu } from "./header/product-switcher-menu";
import { WorkspaceSwitcher } from "./header/workspace-switcher";
import { useProductSidebarVisibility } from "./sidebar/use-product-sidebar-visibility";
import { useAccess } from "@/hooks/api/access";
import { AppLoadingScreen } from "@/components/ui/app-loading-screen";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { AskOsProvider } from "@/components/assistant/ask-os-provider";
import { CommandPaletteProvider } from "@/features/command-palette";
import { ChatMobileBottomNav } from "@/features/chat/chat-mobile-bottom-nav";
import { getChatMobileContentPaddingClassName } from "@/features/chat/chat-mobile-chrome-layout";
import { MobileModuleBottomNav } from "./mobile/mobile-module-bottom-nav";
import { MobileShellFab } from "./mobile/mobile-shell-fab";
import {
  getMobileModuleContentPaddingClassName,
  shouldShowMobileModuleBottomNav,
} from "./mobile/mobile-module-nav-items";
import { cn } from "@/lib/utils";

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
);

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
  const pathname = usePathname();
  const route = pathname ?? "";
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(defaultCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChatConversationOpen, setIsChatConversationOpen] = useState(false);
  const [productSwitcherOpen, setProductSwitcherOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const { hideSidebar, navGroups } = useProductSidebarVisibility();
  const {
    isLoading: accessLoading,
    isError: accessError,
    error: accessErr,
    refetch: refetchAccess,
  } = useAccess();
  usePushSubscription(userId);
  const rafIdRef = useRef<number | null>(null);

  const handleRetryAccess = useCallback(() => {
    void refetchAccess();
  }, [refetchAccess]);

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

  useEffect(() => {
    if (!route.startsWith("/chat")) return;
    const handleConversationChange = (event: Event) => {
      if (
        !(event instanceof CustomEvent) ||
        typeof event.detail !== "boolean"
      ) {
        return;
      }
      setIsChatConversationOpen(event.detail);
    };
    window.addEventListener(
      "chat:conversation-change",
      handleConversationChange,
    );
    return () => {
      window.removeEventListener(
        "chat:conversation-change",
        handleConversationChange,
      );
    };
  }, [route]);

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
  const isChatRoute = route.startsWith("/chat");
  const showModuleBottomNav = useMemo(
    () => shouldShowMobileModuleBottomNav(navGroups, { isChatRoute }),
    [navGroups, isChatRoute],
  );
  const showChatBottomNav = isChatRoute && !isChatConversationOpen;
  const showAboveBottomNav = showModuleBottomNav || showChatBottomNav;

  if (hasDashboardAccess && (accessLoading || accessError)) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        {accessError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load your workspace"
            description={getErrorMessage(accessErr)}
            onRetry={handleRetryAccess}
          />
        ) : (
          <AppLoadingScreen className="flex-1" />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none">
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

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <GlobalHeader
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={handleToggleSidebar}
                showSidebarToggle={!hideSidebar}
                mobileNavOpen={mobileMenuOpen}
              />

              <div className="flex min-h-0 flex-1 overflow-hidden">
                {!hideSidebar && (
                  <aside
                    aria-label="Sidebar"
                    style={{ width: sidebarW }}
                    className="relative z-50 hidden h-full shrink-0 flex-col overflow-visible border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out md:flex"
                  >
                    <AppSidebar isCollapsed={isSidebarCollapsed} />
                  </aside>
                )}

                <main
                  id="dashboard-content"
                  className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:pb-6"
                >
                  <div
                    className={cn(
                      "flex min-h-0 flex-1 flex-col overflow-hidden",
                      getMobileModuleContentPaddingClassName(
                        showModuleBottomNav,
                      ),
                      isChatRoute &&
                        getChatMobileContentPaddingClassName(
                          isChatConversationOpen,
                        ),
                    )}
                  >
                    {children}
                    <WelcomeToast />
                    <SuccessChecklist />
                  </div>
                </main>
              </div>
            </div>

            {!hideSidebar && (
              <Drawer
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
                direction="bottom"
                modal
              >
                <DrawerContent className="z-[100] flex h-[96dvh] max-h-[96dvh] w-full flex-col gap-0 overflow-hidden rounded-t-xl border-t border-sidebar-border bg-sidebar p-0 pb-[env(safe-area-inset-bottom)]">
                  <DrawerTitle className="sr-only">Navigation</DrawerTitle>
                  <AppSidebar
                    isMobile
                    onNavigate={handleCloseMobileMenu}
                    onRequestProductSwitcher={handleRequestProductSwitcher}
                    onRequestWorkspaceSwitcher={handleRequestWorkspaceSwitcher}
                  />
                </DrawerContent>
              </Drawer>
            )}

            <ProductSwitcherMenu
              drawerOnly
              open={productSwitcherOpen}
              onOpenChange={setProductSwitcherOpen}
            />
            <WorkspaceSwitcher
              drawerOnly
              open={workspaceSwitcherOpen}
              onOpenChange={setWorkspaceSwitcherOpen}
            />

            <MobileModuleBottomNav />
            {isChatRoute && (
              <ChatMobileBottomNav onOpenMobileMenu={handleOpenMobileMenu} />
            )}
            {!(isChatRoute && isChatConversationOpen) && (
              <MobileShellFab
                onOpenMobileMenu={handleOpenMobileMenu}
                showAboveBottomNav={showAboveBottomNav}
              />
            )}
          </AskOsProvider>
        </CommandPaletteProvider>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <NotActivatedPage />
        </div>
      )}
    </div>
  );
}
