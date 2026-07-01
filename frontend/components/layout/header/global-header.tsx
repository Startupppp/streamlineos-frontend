"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import Image from "next/image"
import { Search, Sparkles, CalendarDays, MessageSquare } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { WorkspaceSwitcher } from "./workspace-switcher"
import { ProductSwitcherMenu } from "./product-switcher-menu"
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

export function GlobalHeader() {
  return (
    <header className="hidden md:flex items-center h-14 px-4 gap-3 border-b border-border bg-background shrink-0 z-40 relative">
      <TooltipProvider>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard"
            className="h-8 w-8 rounded-lg overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
            aria-label="Home"
          >
            <Image src="/logo.svg" alt="StreamlineOS" width={32} height={32} className="object-contain p-0.5" />
          </Link>
          <WorkspaceSwitcher />
          <div className="w-px h-4 bg-border/70" />
          <ProductSwitcherMenu />
        </div>

        <div className="flex-1 flex justify-center px-4 min-w-0">
          <SearchButton />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/ai"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="AI Assistant"
              >
                <Sparkles className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">AI Assistant</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/calendar"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Calendar"
              >
                <CalendarDays className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Calendar</TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/chat"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Chat"
              >
                <MessageSquare className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Chat</TooltipContent>
          </Tooltip>

          <NotificationBell />

          <div className="w-px h-4 bg-border/70 mx-1" />

          <QuickCreateButton />

          <div className="w-px h-4 bg-border/70 mx-1" />

          <UserAvatarMenu />
        </div>
      </TooltipProvider>
    </header>
  )
}
