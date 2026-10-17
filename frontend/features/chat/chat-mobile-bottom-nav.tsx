"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import {
  CompassIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  getChatMobileBottomNavClassName,
  getChatMobileBottomNavItemsClassName,
} from "@/components/layout/mobile/chat-mobile-chrome-layout";
import { ChatPresenceMenu } from "./chat-presence-menu";

const EXPLORE_LINK_CLASS =
  "inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-md py-1 text-dense text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const NAV_BUTTON_CLASS =
  "h-auto min-h-11 min-w-11 flex-col gap-0.5 py-1 text-dense text-muted-foreground";

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
  const [createOpen, setCreateOpen] = useState(false);
  const handleSearch = useCallback(() => {
    dispatchChatEvent("chat:open-search");
  }, []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleNewDM = useCallback(() => {
    setCreateOpen(false);
    dispatchChatEvent("chat:open-new-dm");
  }, []);
  const handleNewChannel = useCallback(() => {
    setCreateOpen(false);
    dispatchChatEvent("chat:open-new-channel");
  }, []);

  return (
    <nav className={getChatMobileBottomNavClassName()} aria-label="Chat actions">
      <div className={getChatMobileBottomNavItemsClassName()}>
        <AnimatedIconButton
          icon={MenuIcon}
          iconSize={20}
          variant="ghost"
          className={NAV_BUTTON_CLASS}
          onClick={onOpenMobileMenu}
          aria-label="Menu"
        >
          Menu
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={SearchIcon}
          iconSize={20}
          variant="ghost"
          className={NAV_BUTTON_CLASS}
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
          className={NAV_BUTTON_CLASS}
          onClick={handleOpenCreate}
          aria-label="New conversation"
        >
          New
        </AnimatedIconButton>
        <ChatPresenceMenu compact />
      </div>
      {createOpen && (
        <ChatCreateDrawer
          onOpenChange={setCreateOpen}
          onNewDM={handleNewDM}
          onNewChannel={handleNewChannel}
        />
      )}
    </nav>
  );
}

function ChatCreateDrawer({
  onOpenChange,
  onNewDM,
  onNewChannel,
}: {
  onOpenChange: (open: boolean) => void;
  onNewDM: () => void;
  onNewChannel: () => void;
}) {
  const handleOpenChange = useCallback(
    (open: boolean) => onOpenChange(open),
    [onOpenChange],
  );
  return (
    <Drawer open onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Start a conversation</DrawerTitle>
          <DrawerDescription>Message one person, or open a channel for a group.</DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={18}
            variant="outline"
            className="h-11 w-full justify-start"
            onClick={onNewDM}
          >
            Direct message
          </AnimatedIconButton>
          <AnimatedIconButton
            icon={UsersIcon}
            iconSize={18}
            variant="outline"
            className="h-11 w-full justify-start"
            onClick={onNewChannel}
          >
            New channel
          </AnimatedIconButton>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
