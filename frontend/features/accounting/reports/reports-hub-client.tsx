"use client";

import Link from "next/link";
import {
  BarChart3,
  Coins,
  Landmark,
  Percent,
  Scale,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";

interface ReportLink {
  href: string;
  founder: string;
  accountant: string;
  description: string;
  icon: typeof BarChart3;
}

const REPORTS: readonly ReportLink[] = [
  {
    href: "/accounting/profit-loss",
    founder: "Did we make money?",
    accountant: "Profit and loss",
    description:
      "Money in against money out for a period, with the period before it beside it.",
    icon: TrendingUp,
  },
  {
    href: "/accounting/balance-sheet",
    founder: "What we own and what we owe",
    accountant: "Balance sheet",
    description: "Everything the business owns and owes on a single date.",
    icon: Landmark,
  },
  {
    href: "/accounting/cash-flow",
    founder: "Where the cash went",
    accountant: "Cash flow statement",
    description: "How the bank balance moved, and what this method cannot explain.",
    icon: Coins,
  },
  {
    href: "/accounting/trial-balance",
    founder: "Every account, checked",
    accountant: "Trial balance",
    description: "Closing debit and credit for every account, proving the ledger balances.",
    icon: Scale,
  },
  {
    href: "/accounting/reports/aging",
    founder: "Who owes whom, and how late",
    accountant: "Receivables and payables ageing",
    description: "Open invoices and bills grouped by how overdue they are.",
    icon: Users,
  },
  {
    href: "/accounting/taxes",
    founder: "Tax we collected and tax we paid",
    accountant: "Tax summary",
    description: "Every tax line on invoices and bills, grouped by component and rate.",
    icon: Percent,
  },
];

export function ReportsHubClient() {
  const canView = useCan("accounting:reports:read");

  return (
    <PageWrapper
      title="Reports"
      subtitle="Every figure is computed from the ledger when you ask for it. Nothing is stored, so nothing can drift."
    >
      {!canView ? (
        <NoPermissionState permission="accounting:reports:read" />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {REPORTS.map((report) => (
              <Link
                key={report.href}
                href={report.href}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-all",
                  "hover:border-primary/40 hover:shadow-md",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <report.icon className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold">{report.founder}</span>
                </div>
                <p className="text-label text-muted-foreground">{report.description}</p>
                <p className="text-dense font-medium tracking-wider text-muted-foreground">
                  {report.accountant}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
