"use client";

import Link from "next/link";
import { Calculator, BookOpen, ScrollText, BarChart3 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { DS } from "@/lib/design-system";
import { useAccounts, useJournal, useTrialBalance } from "@/lib/api/hooks/accounting";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface NavCard {
  href: string;
  title: string;
  description: string;
  icon: typeof Calculator;
  accent: string;
}

const NAV_CARDS: ReadonlyArray<NavCard> = [
  {
    href: "/accounting/coa",
    title: "Chart of Accounts",
    description: "Manage ledger accounts and account hierarchy.",
    icon: Calculator,
    accent: "bg-blue-500/10 text-blue-600",
  },
  {
    href: "/accounting/journal",
    title: "Journal",
    description: "Record and review double-entry journal entries.",
    icon: BookOpen,
    accent: "bg-violet-500/10 text-violet-600",
  },
  {
    href: "/accounting/trial-balance",
    title: "Trial Balance",
    description: "Snapshot of debit and credit balances.",
    icon: ScrollText,
    accent: "bg-emerald-500/10 text-emerald-600",
  },
  {
    href: "/accounting/profit-loss",
    title: "Profit & Loss",
    description: "Income and expense report for a period.",
    icon: BarChart3,
    accent: "bg-amber-500/10 text-amber-600",
  },
];

export default function AccountingHubPage() {
  const asOf = todayIso();
  const accountsQuery = useAccounts({ page: 1, pageSize: 1 });
  const journalQuery = useJournal({ page: 1, pageSize: 1 });
  const trialBalanceQuery = useTrialBalance(asOf);

  const accountsTotal = accountsQuery.data?.total ?? 0;
  const journalTotal = journalQuery.data?.total ?? 0;
  const trialBalanceLoaded = trialBalanceQuery.data !== undefined;
  const trialBalanceStatus = trialBalanceLoaded
    ? trialBalanceQuery.data?.balanced
      ? "Balanced"
      : "Imbalanced"
    : "—";
  const trialBalanceColor = trialBalanceLoaded
    ? trialBalanceQuery.data?.balanced
      ? "green"
      : "red"
    : "blue";

  return (
    <PageWrapper
      eyebrow="Finance · Accounting"
      title="Accounting"
      subtitle="Chart of accounts, journal entries, and Indian-GST-aware reports."
    >
      <div className="space-y-6">
        <div className={DS.gridResponsive4}>
          <StatCard
            label="Accounts"
            value={accountsTotal}
            icon={Calculator}
            color="blue"
            index={0}
            href="/accounting/coa"
          />
          <StatCard
            label="Journal Entries"
            value={journalTotal}
            icon={BookOpen}
            color="violet"
            index={1}
            href="/accounting/journal"
          />
          <StatCard
            label="Trial Balance"
            value={trialBalanceStatus}
            icon={ScrollText}
            color={trialBalanceColor}
            index={2}
            href="/accounting/trial-balance"
          />
          <StatCard
            label="GST Mode"
            value="Indian GST"
            icon={BarChart3}
            color="amber"
            index={3}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {NAV_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-blue-300/40 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug">
                      {card.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
