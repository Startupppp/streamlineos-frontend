"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Search, CalendarDays, MessageSquare } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ProductSwitcherMenu } from "./product-switcher-menu"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { QuickCreateButton } from "./quick-create-button"
import { UserAvatarMenu } from "./user-avatar-menu"

const NotificationBell = dynamic(
  () => import("@/features/notifications/notification-bell").then((m) => m.NotificationBell),
  { ssr: false },
)

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
      className="flex items-center gap-2 h-8 w-full max-w-xs px-3 rounded-lg bg-card border border-border shadow-xs text-muted-foreground hover:border-blue-300 transition-[color,box-shadow,border-color]"
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

function DesktopHeader() {
  return (
    <div className="flex items-center h-full w-full px-4 gap-3">
      <div className="flex items-center gap-2 shrink-0 min-w-0">
        <ProductSwitcherMenu />
        <div className="w-px h-4 bg-border/70" />
        <WorkspaceSwitcher variant="header" />
      </div>

      <div className="flex-1 flex justify-center min-w-0 px-4">
        <SearchButton />
      </div>

      <div className="flex items-center gap-1 shrink-0">
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

export function GlobalHeader() {
  return (
    <header className="hidden md:block h-14 border-b border-border bg-background shrink-0 z-40 relative">
      <TooltipProvider>
        <DesktopHeader />
      </TooltipProvider>
    </header>
  )
}
