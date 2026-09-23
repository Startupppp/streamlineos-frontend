"use client";

import { useCallback } from "react";
import Link from "next/link";

import {
  CompassIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
} from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  getChatMobileBottomNavClassName,
  getChatMobileBottomNavItemsClassName,
} from "@/components/layout/mobile/chat-mobile-chrome-layout";
import { ChatPresenceMenu } from "./chat-presence-menu";

const EXPLORE_LINK_CLASS =
  "inline-flex min-w-11 flex-col items-center gap-0.5 rounded-md py-1 text-micro text-muted-foreground hover:bg-accent hover:text-accent-foreground";

function ExploreNavLink() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Link
      href="/chat/channels"
      aria-label="Explore channels"
      className={EXPLORE_LINK_CLASS}
      {...hoverHandlers}
    >
      <CompassIcon ref={iconRef} size={20} />
      <span>Explore</span>
    </Link>
  );
}

interface ChatMobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

function dispatchChatEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

export function ChatMobileBottomNav({
  onOpenMobileMenu,
}: ChatMobileBottomNavProps) {
  const handleSearch = useCallback(() => {
    dispatchChatEvent("chat:open-search");
  }, []);
  const handleNewDM = useCallback(() => {
    dispatchChatEvent("chat:open-new-dm");
  }, []);
  return (
    <nav className={getChatMobileBottomNavClassName()} aria-label="Chat navigation">
      <div className={getChatMobileBottomNavItemsClassName()}>
        <AnimatedIconButton
          icon={MenuIcon}
          iconSize={20}
          variant="ghost"
          className="h-auto min-w-11 flex-col gap-0.5 py-1 text-micro text-muted-foreground"
          onClick={onOpenMobileMenu}
          aria-label="Menu"
        >
          Menu
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={SearchIcon}
          iconSize={20}
          variant="ghost"
          className="h-auto min-w-11 flex-col gap-0.5 py-1 text-micro text-muted-foreground"
          onClick={handleSearch}
          aria-label="Search conversations"
        >
          Search
        </AnimatedIconButton>
        <ExploreNavLink />
        <AnimatedIconButton
          icon={PlusIcon}
          iconSize={20}
          variant="ghost"
          className="h-auto min-w-11 flex-col gap-0.5 py-1 text-micro text-muted-foreground"
          onClick={handleNewDM}
          aria-label="New direct message"
        >
          New DM
        </AnimatedIconButton>
        <ChatPresenceMenu compact />
      </div>
    </nav>
  );
}
