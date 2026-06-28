"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  TrendingUp,
  Building2,
  BarChart3,
  Wallet,
  LifeBuoy,
  Settings as SettingsIcon,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useSignOut } from "@/lib/hooks/auth-hooks";
import { cn } from "@/lib/utils";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "inbox";
};

const NAV: Item[] = [
  { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/owner/inbox", label: "Inbox", icon: Inbox, badgeKey: "inbox" },
  { href: "/owner/leads", label: "Leads", icon: TrendingUp },
  { href: "/owner/customers", label: "Customers", icon: Building2 },
  { href: "/owner/visitors", label: "Visitors", icon: BarChart3 },
  { href: "/owner/revenue", label: "Revenue", icon: Wallet },
  { href: "/owner/support", label: "Support", icon: LifeBuoy },
  { href: "/owner/settings", label: "Settings", icon: SettingsIcon },
];

const COLLAPSE_KEY = "owner.sidebar.collapsed";

export function OwnerSidebar({
  ownerName,
  ownerEmail,
  unreadInbox,
}: {
  ownerName: string;
  ownerEmail: string;
  unreadInbox: number;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { mutate: handleSignOut, isPending: isSigningOut } = useSignOut();

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const badge: Record<string, number> = { inbox: unreadInbox };
  const initials = ownerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside
      className={cn(
        "hidden lg:flex shrink-0 flex-col bg-card text-foreground border-r border-border transition-[width] duration-200 ease-out",
        collapsed ? "w-[56px]" : "w-[220px]",
      )}
    >
      <div
        className={cn(
          "h-12 shrink-0 border-b border-border flex items-center",
          collapsed ? "justify-center px-2" : "justify-between px-3",
        )}
      >
        <Link href="/owner" className="flex items-center gap-2 min-w-0" aria-label="StreamlineOS">
          <AnimatedLogo size={26} className="rounded-md shrink-0" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[12.5px] font-bold tracking-tight text-foreground truncate">
                StreamlineOS
              </p>
              <p className="text-[9px] font-mono uppercase tracking-[0.16em] text-blue-600">
                Owner
              </p>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/owner"
              ? pathname === "/owner"
              : pathname?.startsWith(item.href);
          const badgeCount = item.badgeKey ? badge[item.badgeKey] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center rounded-md text-[12.5px] font-medium transition-colors",
                collapsed ? "justify-center h-8" : "gap-2 px-2 h-8",
                active
                  ? "text-foreground bg-sidebar-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-gradient-to-b from-cyan-500 to-blue-600" />
              )}
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  active ? "text-blue-600" : "text-muted-foreground",
                )}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="text-[9.5px] font-mono px-1.5 py-px rounded bg-blue-600 text-white">
                      {badgeCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && badgeCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border px-2 py-1.5">
        <div
          className={cn(
            "flex items-center gap-2 px-1 py-1 rounded-md",
            collapsed && "justify-center",
          )}
        >
          <span
            className="h-6 w-6 rounded-full inline-flex items-center justify-center text-[9.5px] font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
            title={collapsed ? `${ownerName} · ${ownerEmail}` : undefined}
          >
            {initials}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold text-foreground truncate leading-tight">
                {ownerName}
              </p>
              <p className="text-[10px] font-mono text-muted-foreground truncate">
                {ownerEmail}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => handleSignOut()}
          disabled={isSigningOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center rounded-md text-[11.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "justify-center h-7" : "gap-2 px-2 h-7",
          )}
        >
          <LogOut className="h-3 w-3 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
        {collapsed && (
          <button
            onClick={toggle}
            aria-label="Expand sidebar"
            className="mt-1 w-full inline-flex items-center justify-center h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <PanelLeft className="h-3 w-3" />
          </button>
        )}
      </div>
    </aside>
  );
}
