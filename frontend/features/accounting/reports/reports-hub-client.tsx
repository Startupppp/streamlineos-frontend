"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
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
import { TruncatedText } from "@/components/ui/truncated-text";

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
  Core: { bg: "bg-status-info-surface", text: "text-status-info-ink" },
  Receivables: { bg: "bg-status-success-surface", text: "text-status-success-ink" },
  Payables: { bg: "bg-status-warning-surface", text: "text-status-warning-ink" },
  Sales: { bg: "bg-status-info-surface", text: "text-status-info-ink" },
  Expenses: { bg: "bg-status-warning-surface", text: "text-status-warning-ink" },
  Tax: { bg: "bg-status-info-surface", text: "text-status-info-ink" },
  Analytics: { bg: "bg-status-info-surface", text: "text-status-info-ink" },
  Budgeting: { bg: "bg-category-pink-surface", text: "text-category-pink-ink" },
  Overview: { bg: "bg-muted", text: "text-muted-foreground" },
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
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary/30 hover:shadow-sm hover:bg-muted/20"
      {...hoverHandlers}
    >
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${tone.bg}`}>
        <Icon ref={iconRef} className={`h-4 w-4 ${tone.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <TruncatedText text={item.name} className="text-sm font-semibold text-foreground" />
        <TruncatedText text={item.description} lines={2} className="mt-0.5 text-xs text-muted-foreground leading-snug" />
        {item.exportable && (
          <span className="inline-flex mt-1.5 items-center px-1.5 py-0.5 rounded text-micro font-medium bg-status-success-surface text-status-success-ink border border-status-success-rule">
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

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleClearSearch(): void {
    setSearch("");
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
      title="Reports"
      subtitle="Financial reports, statements, and analytics for your organisation."
      filters={
        <SearchInput placeholder="Search reports…" value={search} onValueChange={handleSearchChange} />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((group) => (
              <div key={group}>
                <Skeleton className="h-4 w-24 mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to load reports catalog"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            illustration={<EmptyReportIllustration />}
            title="No reports available"
            description={search ? undefined : "Reports will appear here once the accounting module is configured."}
            filtersActive={!!search}
            onClearFilters={handleClearSearch}
          />
        ) : (
          <div className="space-y-4">
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
      </div>
    </PageWrapper>
  );
}
