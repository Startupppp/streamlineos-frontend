"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KbBarChart2Icon,
  KbBookOpenTextIcon,
  KbClipboardCheckIcon,
  KbClockIcon,
  KbLayoutGridIcon,
  KbLayoutTemplateIcon,
  KbLockIcon,
  KbSearchIcon,
  KbSettingsIcon,
  KbStarIcon,
  KbTrash2Icon,
  KbUploadIcon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import type { KbIconComponent } from "@/features/wiki/lib/kb-icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  KNOWLEDGE_BASE,
  KB_ANALYTICS,
  KB_FAVORITES,
  KB_IMPORT,
  KB_PRIVATE,
  KB_RECENT,
  KB_REVIEWS,
  KB_SETTINGS,
  KB_SHARED,
  KB_SPACES,
  KB_TEMPLATES,
  KB_TRASH,
} from "@/lib/knowledge-routes";

const WIKI_NAV_GROUPS_KEY = "wiki-nav-groups";

interface WikiNavItem {
  label: string;
  href: string;
  icon: KbIconComponent;
  exact?: boolean;
}

interface WikiNavGroup {
  id: string;
  label: string;
  items: WikiNavItem[];
}

interface WikiSidebarNavProps {
  isCollapsed?: boolean;
  canViewAnalytics: boolean;
  canViewReviews: boolean;
  canManageSettings: boolean;
}

interface WikiSidebarFooterProps {
  isCollapsed?: boolean;
  onQuickFind: () => void;
}

function buildPrimaryItems(): WikiNavItem[] {
  return [
    { label: "Wiki", href: KNOWLEDGE_BASE, icon: KbBookOpenTextIcon, exact: true },
    { label: "Recent", href: KB_RECENT, icon: KbClockIcon },
    { label: "Favorites", href: KB_FAVORITES, icon: KbStarIcon },
  ];
}

function buildNavGroups({
  canViewAnalytics,
  canViewReviews,
  canManageSettings,
}: Pick<
  WikiSidebarNavProps,
  "canViewAnalytics" | "canViewReviews" | "canManageSettings"
>): WikiNavGroup[] {
  const manageItems: WikiNavItem[] = [
    { label: "Templates", href: KB_TEMPLATES, icon: KbLayoutTemplateIcon },
  ];

  if (canViewReviews) {
    manageItems.push({ label: "Reviews", href: KB_REVIEWS, icon: KbClipboardCheckIcon });
  }

  manageItems.push({ label: "Import", href: KB_IMPORT, icon: KbUploadIcon });

  if (canViewAnalytics) {
    manageItems.push({ label: "Analytics", href: KB_ANALYTICS, icon: KbBarChart2Icon });
  }

  if (canManageSettings) {
    manageItems.push({ label: "Settings", href: KB_SETTINGS, icon: KbSettingsIcon });
  }

  return [
    {
      id: "library",
      label: "Library",
      items: [
        { label: "Private", href: KB_PRIVATE, icon: KbLockIcon },
        { label: "Shared", href: KB_SHARED, icon: KbUsersIcon },
        { label: "Spaces", href: KB_SPACES, icon: KbLayoutGridIcon },
      ],
    },
    {
      id: "manage",
      label: "Manage",
      items: manageItems,
    },
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

function readStoredOpenGroups(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(WIKI_NAV_GROUPS_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return null;
  }
}

function WikiNavLink({
  item,
  isActive,
  isCollapsed,
}: {
  item: WikiNavItem;
  isActive: boolean;
  isCollapsed?: boolean;
}) {
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
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

export function WikiSidebarFooter({ isCollapsed, onQuickFind }: WikiSidebarFooterProps) {
  const pathname = usePathname();
  const trashActive = isNavItemActive(pathname, KB_TRASH);
  const quickFindIcon = useAnimatedNavIconHover();
  const trashIcon = useAnimatedNavIconHover();

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1 py-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={onQuickFind}
              aria-label="Quick find"
              {...quickFindIcon.animatedNavHoverHandlers}
            >
              <SidebarAnimatedNavIcon
                icon={KbSearchIcon}
                iconRef={quickFindIcon.iconRef}
                className="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-xs">
            Quick find
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={KB_TRASH}
              aria-current={trashActive ? "page" : undefined}
              aria-label="Trash"
              {...trashIcon.animatedNavHoverHandlers}
              className={cn(
                "flex size-8 items-center justify-center rounded-md transition-colors",
                trashActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <SidebarAnimatedNavIcon
                icon={KbTrash2Icon}
                iconRef={trashIcon.iconRef}
                className="size-4"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="text-xs">
            Trash
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 p-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={onQuickFind}
        {...quickFindIcon.animatedNavHoverHandlers}
      >
        <SidebarAnimatedNavIcon
          icon={KbSearchIcon}
          iconRef={quickFindIcon.iconRef}
          className="size-4"
        />
        <span>Quick find</span>
        <span className="ml-auto text-xs text-muted-foreground">⌘K</span>
      </Button>
      <Link
        href={KB_TRASH}
        aria-current={trashActive ? "page" : undefined}
        {...trashIcon.animatedNavHoverHandlers}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
          trashActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <SidebarAnimatedNavIcon
          icon={KbTrash2Icon}
          iconRef={trashIcon.iconRef}
          className="size-4"
        />
        <span>Trash</span>
      </Link>
    </div>
  );
}

export default function WikiSidebarNav({
  isCollapsed = false,
  canViewAnalytics,
  canViewReviews,
  canManageSettings,
}: WikiSidebarNavProps) {
  const pathname = usePathname();
  const primaryItems = useMemo(() => buildPrimaryItems(), []);
  const groups = useMemo(
    () =>
      buildNavGroups({
        canViewAnalytics,
        canViewReviews,
        canManageSettings,
      }),
    [canViewAnalytics, canViewReviews, canManageSettings],
  );
  const accordionItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const defaultOpenGroups = useMemo(() => groups.map((group) => group.id), [groups]);
  const [openGroups, setOpenGroups] = useState<string[]>(defaultOpenGroups);

  const activeGroupId = useMemo(() => {
    for (const group of groups) {
      if (group.items.some((item) => isNavItemActive(pathname, item.href, item.exact))) {
        return group.id;
      }
    }
    return null;
  }, [groups, pathname]);

  useEffect(() => {
    const stored = readStoredOpenGroups();
    if (stored) {
      setOpenGroups(stored);
    }
  }, []);

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroups((prev) => {
      if (prev.includes(activeGroupId)) return prev;
      const next = [...prev, activeGroupId];
      localStorage.setItem(WIKI_NAV_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  }, [activeGroupId]);

  const handleOpenGroupsChange = useCallback((next: string[]) => {
    setOpenGroups(next);
    localStorage.setItem(WIKI_NAV_GROUPS_KEY, JSON.stringify(next));
  }, []);

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 px-1 py-1">
        {primaryItems.map((item) => (
          <WikiNavLink
            key={item.href}
            item={item}
            isActive={isNavItemActive(pathname, item.href, item.exact)}
            isCollapsed
          />
        ))}
        {accordionItems.map((item) => (
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
    <div className="px-2 pb-1 pt-1">
      <div className="space-y-0.5">
        {primaryItems.map((item) => (
          <WikiNavLink
            key={item.href}
            item={item}
            isActive={isNavItemActive(pathname, item.href, item.exact)}
          />
        ))}
      </div>
      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={handleOpenGroupsChange}
        className="mt-1 space-y-0.5"
      >
        {groups.map((group) => (
          <AccordionItem key={group.id} value={group.id} className="border-none">
            <AccordionTrigger className="items-center gap-2 px-2 py-1.5 text-dense font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:no-underline [&>svg]:size-3">
              {group.label}
            </AccordionTrigger>
            <AccordionContent className="space-y-0.5 pb-0.5">
              {group.items.map((item) => (
                <WikiNavLink
                  key={item.href}
                  item={item}
                  isActive={isNavItemActive(pathname, item.href, item.exact)}
                />
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Separator className="my-1" />
    </div>
  );
}
