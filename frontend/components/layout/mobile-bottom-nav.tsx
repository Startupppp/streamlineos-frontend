"use client"

import { useCallback } from "react"
import {
  MenuIcon,
  SearchIcon,
} from "@animateicons/react/lucide"
import { cn } from "@/lib/utils"
import { AnimatedLogo } from "@/features/landing/components/animated-logo"
import { useAskOs } from "@/components/assistant/ask-os-context"
import { UserAvatarMenu } from "./header/user-avatar-menu"
import { MobileQuickCreateSheet } from "./mobile-quick-create-sheet"

interface MobileBottomNavProps {
  onOpenMobileMenu: () => void
}

export function MobileBottomNav({ onOpenMobileMenu }: MobileBottomNavProps) {
  const { open: askOsOpen, toggle: toggleAskOs } = useAskOs()

  const handleAskOsClick = useCallback(() => {
    toggleAskOs()
  }, [toggleAskOs])

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
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50 pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
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

        <button
          type="button"
          onClick={handleAskOsClick}
          aria-expanded={askOsOpen}
          aria-label={askOsOpen ? "Close Ask OS assistant" : "Open Ask OS assistant"}
          className={cn(
            "flex flex-col items-center gap-0.5 min-w-[44px] py-1 transition-colors",
            askOsOpen
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <AnimatedLogo size={20} gradient className="rounded-full" />
          <span className="text-[10px] leading-none">Ask OS</span>
        </button>

        <UserAvatarMenu variant="bottom-nav" />
      </div>
    </nav>
  )
}
