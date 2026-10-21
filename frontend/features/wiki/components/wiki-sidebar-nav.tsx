"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import {
  KbBarChart2Icon,
  KbBookOpenTextIcon,
  KbClipboardCheckIcon,
  KbLayoutGridIcon,
  KbLayoutTemplateIcon,
  KbLockIcon,
  KbSearchIcon,
  KbTrash2Icon,
  KbTriangleAlertIcon,
  KbUploadIcon,
  KbUsersIcon,
} from "@/features/wiki/lib/kb-icons";
import type { AnimatedNavIconComponent } from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  KNOWLEDGE_BASE,
  KB_ANALYTICS,
  KB_IMPORT,
  KB_PRIVATE,
  KB_MANAGE,
  KB_REVIEWS,
  KB_SHARED,
  KB_SPACES,
  KB_TEMPLATES,
  KB_TRASH,
} from "@/lib/knowledge-routes";

const WIKI_NAV_GROUPS_KEY = "wiki-nav-groups";

interface WikiNavItem {
  label: string;
  href: string;
  icon: AnimatedNavIconComponent;
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
  canManageContent: boolean;
  canImportPages: boolean;
  canViewSpaces: boolean;
}

interface WikiSidebarFooterProps {
  isCollapsed?: boolean;
  onQuickFind: () => void;
}

function buildPrimaryItems(): WikiNavItem[] {
  return [
    {
      label: "Docs",
      href: KNOWLEDGE_BASE,
      icon: KbBookOpenTextIcon,
      exact: true,
    },
  ];
}

function buildNavGroups({
  canViewAnalytics,
  canViewReviews,
  canManageContent,
  canImportPages,
  canViewSpaces,
}: Omit<WikiSidebarNavProps, "isCollapsed">): WikiNavGroup[] {
  const manageItems: WikiNavItem[] = [];

  if (canViewReviews) {
    manageItems.push({
      label: "Reviews",
      href: KB_REVIEWS,
      icon: KbClipboardCheckIcon,
    });
  }

  if (canImportPages) {
    manageItems.push({
      label: "Import & Export",
      href: KB_IMPORT,
      icon: KbUploadIcon,
    });
  }

  if (canViewAnalytics) {
    manageItems.push({
      label: "Analytics",
      href: KB_ANALYTICS,
      icon: KbBarChart2Icon,
    });
  }

  if (canManageContent) {
    manageItems.push({
      label: "Content Health",
      href: KB_MANAGE,
      icon: KbTriangleAlertIcon,
    });
  }

  const groups: WikiNavGroup[] = [
    {
      id: "library",
      label: "Library",
      items: [
        { label: "My files", href: KB_PRIVATE, icon: KbLockIcon },
        { label: "Shared with me", href: KB_SHARED, icon: KbUsersIcon },
        ...(canViewSpaces
          ? [{ label: "Team folders", href: KB_SPACES, icon: KbLayoutGridIcon }]
          : []),
        { label: "Templates", href: KB_TEMPLATES, icon: KbLayoutTemplateIcon },
      ],
    },
    {
      id: "manage",
      label: "Manage",
      items: manageItems,
    },
  ];
  return groups.filter((group) => group.items.length > 0);
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

function readStoredOpenGroup(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(WIKI_NAV_GROUPS_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed === "string" && parsed.length > 0) return parsed;
    if (Array.isArray(parsed)) {
      const ids = parsed.filter((value): value is string => typeof value === "string");
      return ids[ids.length - 1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function resolvePreferredOpenGroup(
  groups: WikiNavGroup[],
  pathname: string,
): string {
  const activeGroup = groups.find((group) =>
    group.items.some((item) =>
      isNavItemActive(pathname, item.href, item.exact),
    ),
  );
  if (activeGroup) return activeGroup.id;

  const stored = readStoredOpenGroup();
  if (stored && groups.some((group) => group.id === stored)) return stored;

  return groups[0]?.id ?? "";
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

export function WikiSidebarFooter({
  isCollapsed,
  onQuickFind,
}: WikiSidebarFooterProps) {
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
        <Link
          href={KB_TRASH}
          aria-current={trashActive ? "page" : undefined}
          aria-label="Trash"
          title="Trash"
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
  canManageContent,
  canImportPages,
  canViewSpaces,
}: WikiSidebarNavProps) {
  const pathname = usePathname();
  const primaryItems = useMemo(() => buildPrimaryItems(), []);
  const groups = useMemo(
    () =>
      buildNavGroups({
        canViewAnalytics,
        canViewReviews,
        canManageContent,
        canImportPages,
        canViewSpaces,
      }),
    [
      canViewAnalytics,
      canViewReviews,
      canManageContent,
      canImportPages,
      canViewSpaces,
    ],
  );
  const accordionItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const preferredOpenGroup = useMemo(
    () => resolvePreferredOpenGroup(groups, pathname),
    [groups, pathname],
  );
  const [openGroup, setOpenGroup] = useSourceOverride(
    preferredOpenGroup,
    preferredOpenGroup,
  );

  function handleOpenGroupChange(next: string) {
    setOpenGroup(next);
    try {
      localStorage.setItem(WIKI_NAV_GROUPS_KEY, JSON.stringify(next));
    } catch {}
  }

  function handleGroupHover(groupId: string) {
    if (openGroup === groupId) return;
    handleOpenGroupChange(groupId);
  }

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
        type="single"
        collapsible
        value={openGroup}
        onValueChange={handleOpenGroupChange}
        className="mt-1 space-y-0.5"
      >
        {groups.map((group) => (
          <AccordionItem
            key={group.id}
            value={group.id}
            className="border-none"
            onMouseEnter={() => handleGroupHover(group.id)}
          >
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
