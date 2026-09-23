"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGridIcon, MessageCircleIcon, SettingsIcon } from "@animateicons/react/lucide";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import { useCan } from "@/hooks/api/access";

export const CHAT_NAV_ITEMS = [
  { href: "/chat", label: "Discuss", icon: MessageCircleIcon },
  { href: "/chat/channels", label: "Channels", icon: LayoutGridIcon },
  { href: "/chat/settings", label: "Settings", icon: SettingsIcon },
] as const;

type ChatNavItem = (typeof CHAT_NAV_ITEMS)[number];

export function isChatNavItemActive(pathname: string, item: ChatNavItem): boolean {
  if (item.href === "/chat") {
    return pathname === "/chat";
  }
  if (item.href === "/chat/channels") {
    return pathname.startsWith("/chat/channels");
  }
  if (item.href === "/chat/settings") {
    return pathname.startsWith("/chat/settings");
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

  const linkClassName = cn(
    "shrink-0 rounded-lg font-medium transition-colors",
    isCollapsed
      ? "flex size-8 items-center justify-center"
      : "flex h-8 items-center gap-1.5 px-2.5 text-xs whitespace-nowrap",
    isActive
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

  const iconNode = (
    <SidebarAnimatedNavIcon
      icon={Icon}
      iconRef={iconRef}
      className="size-3.5 shrink-0"
    />
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            {...animatedNavHoverHandlers}
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
      {...animatedNavHoverHandlers}
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
  const canManageSettings = useCan("chat:org-settings:manage");
  const items = CHAT_NAV_ITEMS.filter(
    (item) => item.href !== "/chat/settings" || canManageSettings,
  );

  return (
    <nav
      aria-label="Chat navigation"
      className={cn(
        "hidden shrink-0 flex-row items-center gap-0.5 overflow-x-auto border-b border-border/30 scrollbar-hide lg:flex",
        isCollapsed ? "flex-wrap justify-center px-1 py-2" : "px-3 py-2",
      )}
    >
      {items.map((item) => (
        <ChatNavLink
          key={item.href}
          item={item}
          isActive={isChatNavItemActive(pathname, item)}
          isCollapsed={isCollapsed}
        />
      ))}
    </nav>
  );
}
