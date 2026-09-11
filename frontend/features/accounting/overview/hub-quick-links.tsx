"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  NotebookPen,
  Settings,
  Wallet,
} from "lucide-react";
import { useCan } from "@/hooks/api/access";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface QuickLink {
  href: string;
  label: string;
  description: string;
  permission: PermissionKey;
  icon: typeof BookOpen;
}

const LINKS: readonly QuickLink[] = [
  {
    href: "/accounting/reports",
    label: "Reports",
    description: "Profit, balance sheet, cash, tax and who owes whom.",
    permission: "accounting:reports:read",
    icon: BarChart3,
  },
  {
    href: "/accounting/coa",
    label: "Chart of accounts",
    description: "The buckets every figure is sorted into.",
    permission: "accounting:accounts:read",
    icon: BookOpen,
  },
  {
    href: "/accounting/journal",
    label: "New journal entry",
    description: "Record something by hand, two sides at a time.",
    permission: "accounting:journal:post",
    icon: NotebookPen,
  },
  {
    href: "/accounting/general-ledger",
    label: "Account ledger",
    description: "Where a single account stood, and where it stands now.",
    permission: "accounting:general-ledger:read",
    icon: Wallet,
  },
  {
    href: "/accounting/period-close",
    label: "Financial years",
    description: "Close a month so its figures stop moving.",
    permission: "accounting:periods:read",
    icon: CalendarClock,
  },
  {
    href: "/accounting/settings",
    label: "Settings",
    description: "Your book, your currencies and their exchange rates.",
    permission: "accounting:read",
    icon: Settings,
  },
];

function QuickLinkCard({ link }: { link: QuickLink }) {
  const canSee = useCan(link.permission);
  if (!canSee) return null;

  return (
    <Link
      href={link.href}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <link.icon className="h-4 w-4 text-primary" aria-hidden />
        </span>
        <span className="text-sm font-semibold">{link.label}</span>
      </div>
      <p className="text-label text-muted-foreground">{link.description}</p>
    </Link>
  );
}

export function HubQuickLinks() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {LINKS.map((link) => (
        <QuickLinkCard key={link.href} link={link} />
      ))}
    </div>
  );
}
