"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CompassIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
} from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getChatMobileBottomNavClassName } from "./chat-mobile-chrome-layout";
import { ChatPresenceMenu } from "./chat-presence-menu";

interface ChatMobileBottomNavProps {
  onOpenMobileMenu: () => void;
}

function dispatchChatEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

export function ChatMobileBottomNav({
  onOpenMobileMenu,
}: ChatMobileBottomNavProps) {
  const router = useRouter();

  const handleSearch = useCallback(() => {
    dispatchChatEvent("chat:open-search");
  }, []);
  const handleExplore = useCallback(() => {
    router.push("/chat/channels");
  }, [router]);
  const handleNewDM = useCallback(() => {
    dispatchChatEvent("chat:open-new-dm");
  }, []);
  const handleNewChannel = useCallback(() => {
    dispatchChatEvent("chat:open-new-channel");
  }, []);

  return (
    <nav className={getChatMobileBottomNavClassName()} aria-label="Chat navigation">
      <div className="flex h-16 items-center justify-around px-2">
        <AnimatedIconButton
          icon={MenuIcon}
          iconSize={20}
          variant="ghost"
          className="h-auto min-w-11 flex-col gap-0.5 py-1 text-[10px] text-muted-foreground"
          onClick={onOpenMobileMenu}
          aria-label="Menu"
        >
          Menu
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={SearchIcon}
          iconSize={20}
          variant="ghost"
          className="h-auto min-w-11 flex-col gap-0.5 py-1 text-[10px] text-muted-foreground"
          onClick={handleSearch}
          aria-label="Search conversations"
        >
          Search
        </AnimatedIconButton>
        <AnimatedIconButton
          icon={CompassIcon}
          iconSize={20}
          variant="ghost"
          className="h-auto min-w-11 flex-col gap-0.5 py-1 text-[10px] text-muted-foreground"
          onClick={handleExplore}
          aria-label="Explore channels"
        >
          Explore
        </AnimatedIconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={20}
              variant="ghost"
              className="h-auto min-w-11 flex-col gap-0.5 py-1 text-[10px] text-muted-foreground"
              aria-label="Create conversation"
            >
              Create
            </AnimatedIconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" className="w-44">
            <DropdownMenuItem onSelect={handleNewDM}>
              New direct message
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleNewChannel}>
              New channel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChatPresenceMenu compact />
      </div>
    </nav>
  );
}
