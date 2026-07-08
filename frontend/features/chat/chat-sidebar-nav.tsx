"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Mic } from "lucide-react";
import {
  LayoutGridIcon,
  MessageCircleIcon,
  SettingsIcon,
} from "@animateicons/react/lucide";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
  type AnimatedNavIconComponent,
} from "@/components/layout/sidebar/sidebar-animated-nav";

export const CHAT_NAV_ITEMS = [
  { href: "/chat", label: "Discuss", icon: MessageCircleIcon },
  { href: "/chat/channels", label: "Channels", icon: LayoutGridIcon },
  {
    href: "/chat/configuration?tab=settings",
    label: "Settings",
    icon: SettingsIcon,
    configTab: "settings" as const,
  },
  {
    href: "/chat/configuration?tab=voice-video",
    label: "Huddle",
    icon: Mic,
    configTab: "voice-video" as const,
  },
] as const;

type ChatNavItem = (typeof CHAT_NAV_ITEMS)[number];

export function isChatNavItemActive(
  pathname: string,
  item: ChatNavItem,
  configTab: string,
): boolean {
  if (item.href === "/chat") {
    return pathname === "/chat";
  }
  if (item.href === "/chat/channels") {
    return pathname.startsWith("/chat/channels");
  }
  if ("configTab" in item && item.configTab) {
    if (!pathname.startsWith("/chat/configuration")) return false;
    const activeConfigTab = configTab === "voice-video" ? "voice-video" : "settings";
    return item.configTab === activeConfigTab;
  }
  return false;
}

function ChatNavLink({
  item,
  isActive,
  isCollapsed,
}: {
  item: ChatNavItem;
  isActive: boolean;
  isCollapsed?: boolean;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();
  const Icon = item.icon;
  const isAnimatedIcon = item.icon !== Mic;

  const linkClassName = cn(
    "shrink-0 rounded-lg font-medium transition-colors",
    isCollapsed
      ? "flex size-8 items-center justify-center"
      : "flex h-8 items-center gap-1.5 px-2.5 text-[12px] whitespace-nowrap",
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

  const iconNode = isAnimatedIcon ? (
    <SidebarAnimatedNavIcon
      icon={Icon as AnimatedNavIconComponent}
      iconRef={iconRef}
      className="size-3.5 shrink-0"
    />
  ) : (
    <Icon className="size-3.5 shrink-0" />
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            {...(isAnimatedIcon ? animatedNavHoverHandlers : {})}
            className={linkClassName}
          >
            {iconNode}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      {...(isAnimatedIcon ? animatedNavHoverHandlers : {})}
      className={linkClassName}
    >
      {iconNode}
      <span>{item.label}</span>
    </Link>
  );
}

interface ChatSidebarNavProps {
  isCollapsed?: boolean;
}

export function ChatSidebarNav({ isCollapsed = false }: ChatSidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const configTab = searchParams.get("tab") ?? "settings";

  return (
    <nav
      aria-label="Chat navigation"
      className={cn(
        "shrink-0 border-b border-border/30 flex flex-row items-center gap-0.5 overflow-x-auto scrollbar-hide",
        isCollapsed ? "flex-wrap justify-center px-1 py-2" : "px-3 py-2",
      )}
    >
      {CHAT_NAV_ITEMS.map((item) => (
        <ChatNavLink
          key={item.href}
          item={item}
          isActive={isChatNavItemActive(pathname, item, configTab)}
          isCollapsed={isCollapsed}
        />
      ))}
    </nav>
  );
}
