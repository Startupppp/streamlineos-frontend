"use client";

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
} from "lucide-react";
import { signOut } from "next-auth/react";
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
  const badge: Record<string, number> = { inbox: unreadInbox };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#03060f] text-white border-r border-white/[0.06]">
      <div className="px-5 py-5 border-b border-white/[0.05] flex items-center gap-2.5">
        <AnimatedLogo size={32} className="rounded-lg" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold tracking-tight truncate">StreamlineOS</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            Platform Owner
          </p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-hide">
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
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-white/55 hover:text-white hover:bg-white/[0.04]",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-cyan-300")} />
              <span className="flex-1 truncate">{item.label}</span>
              {badgeCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/90 text-white">
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.05]">
        <div className="px-3 py-2 mb-1 flex items-center gap-2.5">
          <span
            className="h-8 w-8 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}
          >
            {ownerName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate">{ownerName}</p>
            <p className="text-[10px] font-mono text-white/45 truncate">{ownerEmail}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
