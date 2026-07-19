"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { GlobalHeader } from "./header/global-header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { CommandPalette } from "./command-palette";
import { NotActivatedPage } from "../auth/not-activated-page";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { usePushSubscription } from "@/hooks/common/use-push-subscription";
import { TrialBanner } from "@/components/billing/trial-banner";
import { ProductSwitcherMenu } from "./header/product-switcher-menu";
import { WorkspaceSwitcher } from "./header/workspace-switcher";
import { useProductSidebarVisibility } from "./sidebar/use-product-sidebar-visibility";
import { AskOsProvider } from "@/components/assistant/ask-os-provider";
import { CommandPaletteProvider } from "@/features/command-palette";
import { ChatMobileBottomNav } from "@/features/chat/chat-mobile-bottom-nav";
import { getChatMobileContentPaddingClassName } from "@/features/chat/chat-mobile-chrome-layout";
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
  const pathname = usePathname();
  const route = pathname ?? "";
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(defaultCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChatConversationOpen, setIsChatConversationOpen] = useState(false);
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

  useEffect(() => {
    if (!route.startsWith("/chat")) return;
    const handleConversationChange = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "boolean") {
        return;
      }
      setIsChatConversationOpen(event.detail);
    };
    window.addEventListener("chat:conversation-change", handleConversationChange);
    return () => {
      window.removeEventListener("chat:conversation-change", handleConversationChange);
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
              mobileNavOpen={mobileMenuOpen}
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
                <div
                  className={cn(
                    "flex-1 min-h-0 overflow-auto flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0",
                    isChatRoute &&
                      getChatMobileContentPaddingClassName(isChatConversationOpen),
                  )}
                >
                  {children}
                  <WelcomeToast />
                  <SuccessChecklist />
                </div>
              </main>
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

            <MobileBottomNav
              onOpenMobileMenu={handleOpenMobileMenu}
              className={isChatRoute ? "max-sm:hidden" : undefined}
            />
            {isChatRoute && (
              <ChatMobileBottomNav onOpenMobileMenu={handleOpenMobileMenu} />
            )}
          </AskOsProvider>
        </CommandPaletteProvider>
      ) : (
        <NotActivatedPage />
      )}
    </div>
  );
}
