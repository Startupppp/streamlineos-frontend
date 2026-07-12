"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  FiBarChart3Icon,
  FiFileTextIcon,
  FiReceiptIcon,
  FiCoinsIcon,
  FiPercentIcon,
  FiTrendingUpIcon,
  FiPiggyBankIcon,
  FiLayersIcon,
  FiBookOpenIcon,
} from "@/features/accounting/shared";
import { useReportsCatalog, type ReportCatalogItem } from "@/hooks/api/accounting/reports";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AnimatedNavIconComponent } from "@/components/layout/sidebar/sidebar-animated-nav";

const CATEGORY_ICONS: Record<string, AnimatedNavIconComponent> = {
  Core: FiBookOpenIcon,
  Receivables: FiCoinsIcon,
  Payables: FiReceiptIcon,
  Sales: FiTrendingUpIcon,
  Expenses: FiBarChart3Icon,
  Tax: FiPercentIcon,
  Analytics: FiLayersIcon,
  Budgeting: FiPiggyBankIcon,
  Overview: FiBarChart3Icon,
};

const CATEGORY_TONES: Record<string, { bg: string; text: string }> = {
  Core: { bg: "bg-blue-50", text: "text-blue-600" },
  Receivables: { bg: "bg-emerald-50", text: "text-emerald-600" },
  Payables: { bg: "bg-orange-50", text: "text-orange-600" },
  Sales: { bg: "bg-cyan-50", text: "text-cyan-600" },
  Expenses: { bg: "bg-amber-50", text: "text-amber-600" },
  Tax: { bg: "bg-violet-50", text: "text-violet-600" },
  Analytics: { bg: "bg-indigo-50", text: "text-indigo-600" },
  Budgeting: { bg: "bg-pink-50", text: "text-pink-600" },
  Overview: { bg: "bg-slate-100", text: "text-slate-600" },
};

const REPORT_PATH_OVERRIDES: Record<string, string> = {
  "budget-vs-actual": "/accounting/budgets",
  "trial-balance": "/accounting/trial-balance",
  "profit-loss": "/accounting/profit-loss",
  "balance-sheet": "/accounting/balance-sheet",
  "cash-flow": "/accounting/cash-flow",
  "gstr-1": "/accounting/gstr-1",
  "gstr-3b": "/accounting/gstr-3b",
  "aged-receivables": "/accounting/aged-receivables",
  "aged-payables": "/accounting/aged-payables",
};

function reportHref(item: ReportCatalogItem): string {
  if (item.id in REPORT_PATH_OVERRIDES) return REPORT_PATH_OVERRIDES[item.id] ?? "";
  return `/accounting/reports/${item.id}`;
}

interface ReportCardProps {
  item: ReportCatalogItem;
  category: string;
}

function ReportCard({ item, category }: ReportCardProps) {
  const Icon = CATEGORY_ICONS[category] ?? FiFileTextIcon;
  const tone = CATEGORY_TONES[category] ?? CATEGORY_TONES.Core;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Link
      href={reportHref(item)}
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-blue-300/40 hover:shadow-sm hover:bg-muted/20"
      {...hoverHandlers}
    >
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${tone.bg}`}>
        <Icon ref={iconRef} className={`h-4 w-4 ${tone.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground leading-snug line-clamp-2">
          {item.description}
        </p>
        {item.exportable && (
          <span className="inline-flex mt-1.5 items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            Exportable
          </span>
        )}
      </div>
    </Link>
  );
}

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
};

export function ReportsHubClient() {
  const [search, setSearch] = useState("");
  const { data: catalog, isLoading, error, refetch } = useReportsCatalog();

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
  }

  function handleRetry(): void {
    void refetch();
  }

  const filtered = catalog
    ? catalog.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  const grouped = filtered.reduce<Record<string, ReportCatalogItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <PageWrapper
      eyebrow="Finance · Accounting"
      title="Reports"
      subtitle="Financial reports, statements, and analytics for your organisation."
      filters={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search reports…"
            value={search}
            onChange={handleSearchChange}
            className="h-8 pl-8 text-sm w-[220px]"
          />
        </div>
      }
    >
      {isLoading ? (
        <LoadingState variant="cards" rows={6} />
      ) : error ? (
        <ErrorState
          title="Failed to load reports catalog"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title={search ? "No reports match your search" : "No reports available"}
          description={search ? "Try a different search term." : "Reports will appear here once the accounting module is configured."}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <motion.div
              key={category}
              initial="initial"
              animate="animate"
              variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-0.5">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((item) => (
                  <motion.div key={item.id} variants={ITEM_VARIANTS}>
                    <ReportCard item={item} category={category} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
