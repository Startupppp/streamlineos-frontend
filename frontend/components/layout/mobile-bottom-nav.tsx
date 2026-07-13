"use client"

import { useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MenuIcon,
  SearchIcon,
  BellIcon,
} from "@animateicons/react/lucide"
import { cn } from "@/lib/utils"
import { useUnreadNotificationCount } from "@/hooks/api/notifications"
import { UserAvatarMenu } from "./header/user-avatar-menu"
import { MobileQuickCreateSheet } from "./mobile-quick-create-sheet"

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void
}

export function MobileBottomNav({ onOpenMobileMenu }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { data: notifData } = useUnreadNotificationCount()
  const unreadNotifCount = notifData?.count ?? 0

  const handleCommandPaletteClick = useCallback(() => {
    const isMac = navigator.userAgent.toLowerCase().includes("mac")
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
      }),
    )
  }, [])

  const isNotificationsActive =
    pathname === "/notifications" || pathname.startsWith("/notifications/")

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border z-50"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-full px-2 pb-safe">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center gap-0.5 min-w-[44px] py-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Menu"
        >
          <MenuIcon size={20} />
          <span className="text-[10px] leading-none">Menu</span>
        </button>

        <button
          type="button"
          onClick={handleCommandPaletteClick}
          className="flex flex-col items-center gap-0.5 min-w-[44px] py-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Search"
        >
          <SearchIcon size={20} />
          <span className="text-[10px] leading-none">Search</span>
        </button>

        <MobileQuickCreateSheet />

        <Link
          href="/notifications"
          className={cn(
            "flex flex-col items-center gap-0.5 min-w-[44px] py-1 transition-colors",
            isNotificationsActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={isNotificationsActive ? "page" : undefined}
        >
          <span className="relative">
            <BellIcon size={20} />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-1 ring-background" />
            )}
          </span>
          <span className="text-[10px] leading-none">Alerts</span>
        </Link>

        <UserAvatarMenu variant="bottom-nav" />
      </div>
    </nav>
  )
}
