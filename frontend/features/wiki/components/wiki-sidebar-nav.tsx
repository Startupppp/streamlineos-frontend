"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  KbBookOpenTextIcon,
  KbLayoutGridIcon,
  KbLayoutTemplateIcon,
  KbLockIcon,
  KbSearchIcon,
  KbTrash2Icon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import type { AnimatedNavIconComponent } from "@/components/layout/sidebar/sidebar-animated-nav";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  KNOWLEDGE_BASE,
  KB_PRIVATE,
  KB_SEARCH,
  KB_SHARED,
  KB_SPACES,
  KB_TEMPLATES,
  KB_TRASH,
} from "@/lib/knowledge-routes";

interface WikiNavItem {
  label: string;
  href: string;
  icon: AnimatedNavIconComponent;
  exact?: boolean;
}

interface WikiSidebarNavProps {
  isCollapsed?: boolean;
  canViewSpaces: boolean;
  variant?: "rail" | "bar";
}

function buildNavItems(canViewSpaces: boolean): WikiNavItem[] {
  return [
    { label: "Docs", href: KNOWLEDGE_BASE, icon: KbBookOpenTextIcon, exact: true },
    { label: "My files", href: KB_PRIVATE, icon: KbLockIcon },
    { label: "Shared with me", href: KB_SHARED, icon: KbUsersIcon },
    ...(canViewSpaces
      ? [{ label: "Team folders", href: KB_SPACES, icon: KbLayoutGridIcon }]
      : []),
    { label: "Templates", href: KB_TEMPLATES, icon: KbLayoutTemplateIcon },
    { label: "Search", href: KB_SEARCH, icon: KbSearchIcon },
    { label: "Trash", href: KB_TRASH, icon: KbTrash2Icon },
  ];
}

function isNavItemActive(
  pathname: string,
  href: string,
  exact?: boolean,
): boolean {
  if (exact) {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function WikiNavLink({
  item,
  isActive,
  isCollapsed,
  compact = false,
}: {
  item: WikiNavItem;
  isActive: boolean;
  isCollapsed?: boolean;
  compact?: boolean;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();

  if (isCollapsed) {
    return (
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
        {...animatedNavHoverHandlers}
        className={cn(
          "flex size-8 items-center justify-center rounded-md transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <SidebarAnimatedNavIcon
          icon={item.icon}
          iconRef={iconRef}
          className="size-4 shrink-0"
        />
      </Link>
    );
  }

  if (compact) {
    return (
      <Link
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
        {...animatedNavHoverHandlers}
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <SidebarAnimatedNavIcon
          icon={item.icon}
          iconRef={iconRef}
          className="size-4 shrink-0"
        />
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      {...animatedNavHoverHandlers}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <SidebarAnimatedNavIcon
        icon={item.icon}
        iconRef={iconRef}
        className="size-4 shrink-0"
      />
      <span>{item.label}</span>
    </Link>
  );
}

export default function WikiSidebarNav({
  isCollapsed = false,
  canViewSpaces,
  variant = "rail",
}: WikiSidebarNavProps) {
  const pathname = usePathname();
  const navItems = useMemo(() => buildNavItems(canViewSpaces), [canViewSpaces]);

  if (variant === "bar") {
    return (
      <nav
        aria-label="Documents"
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide"
      >
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href, item.exact);
          return (
            <WikiNavLink
              key={item.href}
              item={item}
              isActive={isActive}
              isCollapsed={false}
              compact
            />
          );
        })}
      </nav>
    );
  }

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1 py-1">
        {navItems.map((item) => (
          <WikiNavLink
            key={item.href}
            item={item}
            isActive={isNavItemActive(pathname, item.href, item.exact)}
            isCollapsed
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-2 pb-1 pt-1">
      {navItems.map((item) => (
        <WikiNavLink
          key={item.href}
          item={item}
          isActive={isNavItemActive(pathname, item.href, item.exact)}
        />
      ))}
    </div>
  );
}
