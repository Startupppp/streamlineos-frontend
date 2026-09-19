"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { GlobalHeader } from "./header/global-header";
import { CommandPalette } from "./command-palette";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { usePushSubscription } from "@/hooks/common/use-push-subscription";
import { TrialBanner } from "@/components/billing/trial-banner";
import { ImpersonationBanner } from "@/components/impersonation/impersonation-banner";
import { ProductSwitcherMenu } from "./header/product-switcher-menu";
import { WorkspaceSwitcher } from "./header/org-switcher";
import { useProductSidebarVisibility } from "./sidebar/use-product-sidebar-visibility";
import { useAccess } from "@/hooks/api/access";
import { LazyAppLoadingScreen } from "@/components/ui/app-loading-screen-lazy";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { AskOsProvider } from "@/components/assistant/ask-os-provider";
import { CommandPaletteProvider } from "@/components/command-palette";
import { BuildDirtyStateProvider } from "@/features/build/navigation/build-dirty-state-context";
import { getChatMobileContentPaddingClassName } from "./mobile/chat-mobile-chrome-layout";
import { MobileModuleBottomNav } from "./mobile/mobile-module-bottom-nav";
import { MobileShellFab } from "./mobile/mobile-shell-fab";
import { shouldShowMobileModuleBottomNav } from "./mobile/mobile-module-nav-items";
import { isPortalChromelessPath } from "./sidebar/sidebar-nav-items";
import type { BuildSidebarSlot } from "./sidebar/build-sidebar-slot";
import { ShellOfflineBanner } from "./shell-offline-banner";
import { ShellVariantProvider } from "./shell-variant-context";
import { ShellSidebarCollapseProvider } from "./shell-sidebar-collapse-context";
import { useRouteFocus } from "@/hooks/common/use-route-focus";
import { cn } from "@/lib/utils";
import { WELCOME_POP_KEY } from "@/lib/welcome-pop";
import type { ShellVariant } from "@/lib/shell-variant";

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

const SIDEBAR_COOKIE = "sidebar-collapsed";
const SIDEBAR_COLLAPSED_W = "3.5rem";
const SIDEBAR_EXPANDED_W = "17rem";

function setSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

interface DashboardShellProps {
  userId: string;
  defaultCollapsed: boolean;
  shellVariant?: ShellVariant;
  children: React.ReactNode;
  createTicketDialog?: React.ReactNode;
  buildSidebarSlot?: BuildSidebarSlot;
  notificationBellSlot?: React.ReactNode;
  chatMobileNavSlot?: (onOpenMobileMenu: () => void) => React.ReactNode;
}

export function DashboardShell({
  userId,
  defaultCollapsed,
  shellVariant = "desktop",
  children,
  createTicketDialog,
  buildSidebarSlot,
  notificationBellSlot,
  chatMobileNavSlot,
}: DashboardShellProps) {
  const pathname = usePathname();
  const route = pathname ?? "";
  const isPortalRoute = isPortalChromelessPath(route);

  useRouteFocus();

  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(defaultCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productSwitcherOpen, setProductSwitcherOpen] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [isChatConversationOpen, setIsChatConversationOpen] = useState(false);
  const [welcomeToastActive, setWelcomeToastActive] = useState(false);
  const [enhancementsReady, setEnhancementsReady] = useState(false);

  const { hideSidebar, showSidebarToggle, navGroups } =
    useProductSidebarVisibility();
  const {
    data: access,
    error: accessErr,
    isError: accessError,
    refetch: refetchAccess,
    isLoading: accessLoading,
  } = useAccess();
  usePushSubscription(userId);

  const rafIdRef = useRef<number | null>(null);

  const handleRetryAccess = useCallback(() => {
    void refetchAccess();
  }, [refetchAccess]);

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

  const handleRequestOrgSwitcher = useCallback(() => {
    setOrgSwitcherOpen(true);
    deferCloseMobileMenu();
  }, [deferCloseMobileMenu]);

  const sidebarW = isSidebarCollapsed
    ? SIDEBAR_COLLAPSED_W
    : SIDEBAR_EXPANDED_W;
  const isChatRoute = route.startsWith("/chat");
  const showModuleBottomNav = useMemo(
    () =>
      !isPortalRoute &&
      shouldShowMobileModuleBottomNav(navGroups, { isChatRoute }),
    [navGroups, isChatRoute, isPortalRoute],
  );
  const showChatBottomNav = isChatRoute && !isChatConversationOpen;
  const showAboveBottomNav = showModuleBottomNav || showChatBottomNav;

  useEffect(() => {
    if (!route.startsWith("/chat")) return;

    const handleConversationChange = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "boolean")
        return;

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

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_POP_KEY) === "1")
        setWelcomeToastActive(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (access?.isOrgOwner !== true) return;

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(
        () => setEnhancementsReady(true),
        { timeout: 1500 },
      );
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => setEnhancementsReady(true), 250);
    return () => window.clearTimeout(timeoutId);
  }, [access?.isOrgOwner]);

  if ((accessLoading && !access) || (accessError && !access))
    return (
      <div className="flex h-dvh flex-col overflow-hidden">
        {accessError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load your organization"
            description={getErrorMessage(accessErr)}
            onRetry={handleRetryAccess}
          />
        ) : (
          <LazyAppLoadingScreen className="flex-1" />
        )}
      </div>
    );

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none md:pb-6">
      <Link
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </Link>

      <CommandPaletteProvider createTicketDialog={createTicketDialog}>
        <BuildDirtyStateProvider>
          <AskOsProvider>
            <CommandPalette />
            <TrialBanner />
            <ImpersonationBanner />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ShellSidebarCollapseProvider
                isCollapsed={isSidebarCollapsed}
                onToggle={handleToggleSidebar}
              >
                <GlobalHeader
                  isSidebarCollapsed={isSidebarCollapsed}
                  onToggleSidebar={handleToggleSidebar}
                  showSidebarToggle={showSidebarToggle}
                  mobileNavOpen={mobileMenuOpen}
                  hideAdminChrome={isPortalRoute}
                  shellVariant={shellVariant}
                  notificationBellSlot={notificationBellSlot}
                />

                <ShellOfflineBanner />

                <div className="flex min-h-0 flex-1 overflow-hidden">
                  {shellVariant === "desktop" && !hideSidebar && (
                    <aside
                      aria-label="Sidebar"
                      style={{ width: sidebarW }}
                      className="relative z-50 hidden h-full shrink-0 flex-col overflow-visible border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out md:flex"
                    >
                      <AppSidebar
                        isCollapsed={isSidebarCollapsed}
                        buildSidebarSlot={buildSidebarSlot}
                      />
                    </aside>
                  )}

                  <main
                    id="dashboard-content"
                    aria-label="Main content"
                    className={cn(
                      "flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none",
                      showModuleBottomNav && "mobile-nav-active",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
                        isChatRoute &&
                          getChatMobileContentPaddingClassName(
                            isChatConversationOpen,
                          ),
                      )}
                    >
                      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden [&>:first-child]:h-full [&>:first-child]:min-h-0 [&>:first-child]:flex-1">
                        <ShellVariantProvider variant={shellVariant}>
                          {children}
                        </ShellVariantProvider>
                      </div>
                      {welcomeToastActive && <WelcomeToast />}
                      {enhancementsReady ? <SuccessChecklist /> : null}
                    </div>
                  </main>
                </div>
              </ShellSidebarCollapseProvider>
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
                    onRequestOrgSwitcher={handleRequestOrgSwitcher}
                    buildSidebarSlot={buildSidebarSlot}
                  />
                </DrawerContent>
              </Drawer>
            )}

            {!isPortalRoute && (
              <>
                <WorkspaceSwitcher
                  drawerOnly
                  open={orgSwitcherOpen}
                  onOpenChange={setOrgSwitcherOpen}
                />
                <ProductSwitcherMenu
                  drawerOnly
                  open={productSwitcherOpen}
                  onOpenChange={setProductSwitcherOpen}
                />
              </>
            )}

            <MobileModuleBottomNav />
            {isChatRoute && chatMobileNavSlot?.(handleOpenMobileMenu)}
            {!(isChatRoute && isChatConversationOpen) && (
              <MobileShellFab
                onOpenMobileMenu={handleOpenMobileMenu}
                showAboveBottomNav={showAboveBottomNav}
              />
            )}
          </AskOsProvider>
        </BuildDirtyStateProvider>
      </CommandPaletteProvider>
    </div>
  );
}
