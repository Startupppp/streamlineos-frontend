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
import { staggerContainer } from "@/lib/motion-variants";
import { EmptyReportIllustration } from "@/components/illustrations";
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
  if (roi > 0) return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (roi < 0) return "text-red-600 dark:text-red-400 font-semibold";
  return "text-muted-foreground";
}

function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30";
    case "paused": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";
    case "completed": return "bg-muted text-muted-foreground border-border";
    default: return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30";
  }
}

function buildColumns(onRowClick: (id: number) => void): DataTableColumn<CrmCampaign>[] {
  return [
    {
      key: "name",
      header: "Campaign",
      cell: (row) => (
        <button
          className="text-left font-medium text-foreground hover:text-primary transition-colors truncate max-w-[180px]"
          onClick={() => onRowClick(row.id)}
        >
          {row.name}
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

  if (isLoading) {
    return (
      <PageWrapper title="Campaigns" subtitle="Track lead sources and ROI">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
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
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 text-xs w-36">
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
        className="space-y-4"
      >
        {campaigns.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
            <EmptyReportIllustration className="h-32 w-32 opacity-60" />
            <div className="text-center">
              <p className="text-base font-medium text-muted-foreground">No campaigns yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create your first campaign to track leads and ROI.</p>
            </div>
            <LoadingButton size="sm" onClick={handleOpenSheet}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Campaign
            </LoadingButton>
          </div>
        ) : (
          <DataTable columns={columns} data={campaigns} getRowKey={(row) => row.id} />
        )}
      </motion.div>

      <CampaignSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
