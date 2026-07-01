"use client"

import { useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  House,
  MagnifyingGlass,
  Plus,
  Bell,
  UserCircle,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useUnreadNotificationCount } from "@/hooks/api/notifications"

interface NavItem {
  key: string
  label: string
  href: string | null
  Icon: React.ComponentType<{ className?: string; weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone" }>
  isSearch?: boolean
  isCreate?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', href: '/dashboard', Icon: House },
  { key: 'search', label: 'Search', href: null, Icon: MagnifyingGlass, isSearch: true },
  { key: 'create', label: 'Create', href: null, Icon: Plus, isCreate: true },
  { key: 'notifications', label: 'Notifications', href: '/notifications', Icon: Bell },
  { key: 'me', label: 'Me', href: '/settings', Icon: UserCircle },
]

export function MobileBottomNav() {
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

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border z-50"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-full px-2 pb-safe">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href
            ? pathname === item.href || pathname.startsWith(item.href + '/')
            : false
          const isNotif = item.key === 'notifications'

          if (item.isSearch) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={handleCommandPaletteClick}
                className="flex flex-col items-center gap-0.5 min-w-[44px] py-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={item.label}
              >
                <item.Icon className="h-5 w-5" weight="regular" />
                <span className="text-[10px] leading-none">{item.label}</span>
              </button>
            )
          }

          if (item.isCreate) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={handleCommandPaletteClick}
                className="flex flex-col items-center gap-0.5 min-w-[44px] py-1"
                aria-label={item.label}
              >
                <span className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-sm ring-1 ring-primary/20">
                  <item.Icon className="h-4 w-4 text-primary-foreground" weight="bold" />
                </span>
              </button>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href!}
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-[44px] py-1 transition-colors",
                isActive ? "text-blue-600" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="relative">
                <item.Icon
                  className="h-5 w-5 transition-all duration-150"
                  weight={isActive ? "fill" : "regular"}
                />
                {isNotif && unreadNotifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 ring-1 ring-background" />
                )}
              </span>
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
