"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGridIcon,
  UsersIcon,
  ShareIcon,
  LayersIcon,
  SettingsIcon,
  MenuIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserSearchIcon,
} from "@animateicons/react/lucide";
import {
  Briefcase,
  KanbanSquare,
  Inbox,
  Video,
  FileSignature,
  Truck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface RecruitmentNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  comingSoon?: boolean;
}

const NAV_ITEMS: RecruitmentNavItem[] = [
  { label: "Command Center", href: "/hr/recruitment", icon: LayoutGridIcon, exact: true },
  { label: "Jobs", href: "/hr/recruitment/jobs", icon: Briefcase },
  { label: "Candidates", href: "/hr/recruitment/candidates", icon: UsersIcon },
  { label: "Pipeline", href: "/hr/recruitment/pipeline", icon: KanbanSquare },
  { label: "Intake Inbox", href: "/hr/recruitment/candidates?status=NEW", icon: Inbox },
  { label: "Interviews", href: "/hr/recruitment/interviews", icon: Video },
  { label: "Offers", href: "/hr/recruitment/offers", icon: FileSignature, comingSoon: true },
  { label: "Referrals", href: "/hr/recruitment/referrals", icon: ShareIcon },
  { label: "Vendors", href: "/hr/recruitment/vendors", icon: Truck },
  { label: "Talent Pools", href: "/hr/recruitment/talent-pools", icon: LayersIcon, comingSoon: true },
  { label: "Analytics", href: "/hr/recruitment/analytics", icon: BarChart3 },
  { label: "Settings", href: "/hr/recruitment/settings", icon: SettingsIcon, comingSoon: true },
];

const SIDEBAR_COLLAPSED_KEY = "streamlineos:recruitment-sidebar:collapsed";

function isActiveHref(pathname: string, href: string, exact?: boolean): boolean {
  const path = href.split("?")[0]!;
  if (exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: RecruitmentNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (item.comingSoon) {
    return (
      <div
        aria-disabled
        title={collapsed ? `${item.label} — coming soon` : undefined}
        className={cn(
          "flex items-center rounded-md text-[13px] font-medium select-none cursor-not-allowed text-muted-foreground/50",
          collapsed ? "justify-center p-1.5 mx-auto" : "px-2 py-1.5",
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", !collapsed && "mr-2")} />
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-normal">
              Soon
            </Badge>
          </>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "flex items-center rounded-md text-[13px] font-medium transition-colors group relative",
        collapsed ? "justify-center p-1.5 mx-auto" : "px-2 py-1.5",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", !collapsed && "mr-2")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function DesktopSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  function handleToggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  return (
    <div
      className={cn(
        "h-full flex flex-col border-r bg-muted/30 transition-[width] duration-200 ease-out",
        isCollapsed ? "w-[3.25rem]" : "w-56",
      )}
    >
      <div className={cn("shrink-0 border-b", isCollapsed ? "p-1.5" : "px-3 py-2.5")}>
        <Link
          href="/hr"
          className={cn(
            "flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors",
            isCollapsed ? "justify-center mb-1.5" : "mb-2",
          )}
        >
          <ChevronLeftIcon className="h-3 w-3 shrink-0" />
          {!isCollapsed && <span className="ml-1">HR</span>}
        </Link>
        <div className={cn("flex items-center", isCollapsed ? "flex-col gap-1.5" : "gap-2")}>
          <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <UserSearchIcon className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="text-sm font-semibold truncate flex-1 min-w-0">TalentOS</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeftIcon className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className={cn("py-1.5 space-y-0.5", isCollapsed ? "px-1" : "px-1.5")}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActiveHref(pathname, item.href, item.exact)}
              collapsed={isCollapsed}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function handleNavigate() {
    setOpen(false);
  }

  const current = NAV_ITEMS.find((item) => isActiveHref(pathname, item.href, item.exact));

  return (
    <div className="flex items-center gap-2 border-b px-3 py-2 bg-background">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Open recruitment menu">
            <MenuIcon className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Recruitment Navigation</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="px-3 py-3 border-b">
              <Link
                href="/hr"
                className="flex items-center text-xs text-muted-foreground hover:text-foreground mb-2"
                onClick={handleNavigate}
              >
                <ChevronLeftIcon className="h-3 w-3 mr-1" />
                HR
              </Link>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <UserSearchIcon className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold truncate">TalentOS</span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="py-1.5 px-1.5 space-y-0.5">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActiveHref(pathname, item.href, item.exact)}
                    collapsed={false}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-1.5 min-w-0 text-sm">
        <Link href="/hr/recruitment" className="font-semibold text-foreground shrink-0">
          TalentOS
        </Link>
        {current && current.href !== "/hr/recruitment" && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate">{current.label}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function RecruitmentSidebar() {
  return (
    <>
      <div className="hidden md:flex h-full">
        <DesktopSidebar />
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
    </>
  );
}
