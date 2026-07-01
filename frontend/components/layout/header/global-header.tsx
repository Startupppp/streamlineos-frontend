"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Menu, Search, Sparkles, CalendarDays, MessageSquare } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ProductSwitcherMenu } from "./product-switcher-menu"
import { QuickCreateButton } from "./quick-create-button"
import { UserAvatarMenu } from "./user-avatar-menu"
import { cn } from "@/lib/utils"

const NotificationBell = dynamic(
  () => import("@/features/notifications/notification-bell").then((m) => m.NotificationBell),
  { ssr: false },
)

interface GlobalHeaderProps {
  onOpenMobileMenu?: () => void
}

const MOBILE_ICON_BUTTON =
  "h-11 w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"

function SearchButton() {
  function handleClick() {
    const isMac = navigator.userAgent.toLowerCase().includes("mac")
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
      }),
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Search (⌘K)"
      className="flex items-center gap-2 h-8 w-full max-w-xs px-3 rounded-lg bg-muted/60 border border-border/60 text-muted-foreground hover:bg-muted hover:border-border transition-colors"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left text-xs">Search…</span>
      <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-border bg-background px-1 font-mono text-[9px] text-muted-foreground">
        ⌘K
      </kbd>
    </button>
  )
}

function HeaderIconLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={label}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}

function MobileHeader({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  return (
    <div className="md:hidden flex items-center justify-between h-full w-full px-3 gap-1">
      <div className="flex items-center gap-1 shrink-0 min-w-0">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation"
            className={MOBILE_ICON_BUTTON}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <ProductSwitcherMenu mobile />
      </div>

      <div className="flex items-center gap-1 shrink-0 [&_button]:h-11 [&_button]:w-11">
        <NotificationBell />
        <UserAvatarMenu />
      </div>
    </div>
  )
}

function DesktopHeader({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  return (
    <div className="hidden md:flex items-center h-full w-full px-4 gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <ProductSwitcherMenu />
      </div>

      <div
        className={cn(
          "flex-1 flex justify-center min-w-0",
          onOpenMobileMenu ? "px-2" : "px-4",
        )}
      >
        <SearchButton />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <HeaderIconLink href="/ai" label="AI Assistant">
          <Sparkles className="h-4 w-4" />
        </HeaderIconLink>

        <HeaderIconLink href="/calendar" label="Calendar">
          <CalendarDays className="h-4 w-4" />
        </HeaderIconLink>

        <HeaderIconLink href="/chat" label="Chat">
          <MessageSquare className="h-4 w-4" />
        </HeaderIconLink>

        <NotificationBell />

        <div className="w-px h-4 bg-border/70 mx-1" />

        <QuickCreateButton />

        <div className="w-px h-4 bg-border/70 mx-1" />

        <UserAvatarMenu />
      </div>
    </div>
  )
}

export function GlobalHeader({ onOpenMobileMenu }: GlobalHeaderProps) {
  return (
    <header className="h-14 border-b border-border bg-background shrink-0 z-40 relative">
      <TooltipProvider>
        <MobileHeader onOpenMobileMenu={onOpenMobileMenu} />
        <DesktopHeader onOpenMobileMenu={onOpenMobileMenu} />
      </TooltipProvider>
    </header>
  )
}
