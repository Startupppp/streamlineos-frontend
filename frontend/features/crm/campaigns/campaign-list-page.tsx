"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { TruncatedText } from "@/components/ui/truncated-text";
import { staggerContainer } from "@/lib/motion-variants";
import { EmptyReportIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { useCampaigns } from "@/hooks/api/crm/campaigns";
import { formatCurrency } from "@/features/crm/reports/lib/types";
import { CampaignSheet } from "./campaign-sheet";
import type { CrmCampaign } from "@/types/crm/campaigns";
import type { DataTableColumn } from "@/components/ui/data-table";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
];

function roiColorClass(roi: number): string {
  if (roi > 0) return "text-status-success-ink font-semibold";
  if (roi < 0) return "text-status-danger-ink font-semibold";
  return "text-muted-foreground";
}

function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "active": return "bg-status-success-surface text-status-success-ink border-status-success-rule";
    case "paused": return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
    case "completed": return "bg-muted text-muted-foreground border-border";
    default: return "bg-primary/10 text-foreground border-primary/20";
  }
}

function buildColumns(onRowClick: (id: number) => void): DataTableColumn<CrmCampaign>[] {
  return [
    {
      key: "name",
      header: "Campaign",
      cell: (row) => (
        <button
          className="text-left font-medium text-foreground hover:text-primary transition-colors max-w-[180px]"
          onClick={() => onRowClick(row.id)}
        >
          <TruncatedText text={row.name} />
        </button>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={cn("text-xs capitalize", statusBadgeClass(row.status))}>
          {row.status}
        </Badge>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      cell: (row) => (
        <span className="text-sm text-muted-foreground capitalize">
          {row.channel?.replace(/_/g, " ") ?? "—"}
        </span>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      cell: (row) => (
        <span className="text-sm font-mono tabular-nums">
          {row.budgetAllocated ? formatCurrency(Number(row.budgetAllocated)) : "—"}
        </span>
      ),
    },
    {
      key: "spend",
      header: "Spend",
      cell: (row) => (
        <span className="text-sm font-mono tabular-nums">
          {row.spend ? formatCurrency(Number(row.spend)) : "—"}
        </span>
      ),
    },
    {
      key: "leads",
      header: "Leads",
      cell: (row) => (
        <span className="text-sm font-mono tabular-nums">{row.leads}</span>
      ),
      sortable: true,
      sortValue: (row) => row.leads,
    },
    {
      key: "converted",
      header: "Converted",
      cell: () => (
        <span className="text-sm font-mono tabular-nums text-muted-foreground">—</span>
      ),
    },
    {
      key: "revenue",
      header: "Revenue",
      cell: () => (
        <span className="text-sm font-mono tabular-nums text-muted-foreground">—</span>
      ),
    },
    {
      key: "roi",
      header: "ROI",
      cell: (row) => {
        const roiVal = parseFloat(row.roi ?? "0");
        return (
          <span className={cn("text-sm font-mono tabular-nums", roiColorClass(roiVal))}>
            {isNaN(roiVal) ? "—" : `${roiVal.toFixed(1)}%`}
          </span>
        );
      },
      sortable: true,
      sortValue: (row) => parseFloat(row.roi ?? "0"),
    },
  ];
}

export function CampaignListPage() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useCampaigns({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const campaigns = data?.items ?? [];

  const handleRowClick = useCallback(
    (id: number) => {
      router.push(`/crm/campaigns/${id}`);
    },
    [router],
  );

  const columns = buildColumns(handleRowClick);

  const handleStatusChange = useCallback((val: string) => {
    setStatusFilter(val);
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleClearFilters = useCallback(() => setStatusFilter("all"), []);

  const statusFilterLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter;

  if (isLoading) {
    return (
      <PageWrapper title="Campaigns" subtitle="Track lead sources and ROI" noInternalScroll>
        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Campaigns"
      subtitle="Track lead sources and ROI"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-36")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
      actions={
        <LoadingButton size="sm" onClick={handleOpenSheet}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Campaign
        </LoadingButton>
      }
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-1 min-h-0 flex-col space-y-4"
      >
        {campaigns.length === 0 ? (
          statusFilter !== "all" ? (
            <EmptyState
              illustration={<EmptyReportIllustration />}
              title="No campaigns match this filter"
              description={`Showing status ${statusFilterLabel}. Clear the filter to see every campaign.`}
              action={{ label: "Clear filter", onClick: handleClearFilters }}
              actionVariant="outline"
              className="flex-1"
            />
          ) : (
            <EmptyState
              illustration={<EmptyReportIllustration />}
              title="No campaigns yet"
              description="A campaign groups the leads that came from one push — an ad, an event, an email blast — so you can see what it returned."
              action={{ label: "Create campaign", onClick: handleOpenSheet }}
              className="flex-1"
            />
          )
        ) : (
          <DataTable columns={columns} data={campaigns} getRowKey={(row) => row.id} className="flex-1 min-h-0" />
        )}
      </motion.div>

      <CampaignSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
