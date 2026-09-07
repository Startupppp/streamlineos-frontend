"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { EmptyReportIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { RecordList, asRecordValues } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { CAMPAIGN_LAYOUT } from "@/lib/renderer/crm/campaign-layout";
import { useCampaigns } from "@/hooks/api/crm/campaigns";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { CampaignSheet } from "./campaign-sheet";

/**
 * Campaigns.
 *
 * No table is written here. The columns, their alignment, the ROI tone and the
 * mobile card all come from `CAMPAIGN_LAYOUT`; what is left is the one filter
 * this domain has and who is allowed to add a campaign.
 *
 * ROI is green above zero and red below because the description says the sign is
 * good news — `sign: "gain"` — not because this screen carries a colour helper.
 * The helper it used to carry is the reason campaigns could not move onto the
 * engine until the vocabulary could say it.
 */

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "completed", label: "Completed" },
];

export function CampaignListPage() {
  const router = useRouter();
  const layout = useTenantLayout(CAMPAIGN_LAYOUT);
  const money = useOrgDisplay();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [density, setDensity] = useDensity();
  const canManageCampaigns = useCan("crm:campaigns:manage");

  const { data, isLoading, isError, refetch, access } = useCampaigns({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  const campaigns = data?.items ?? [];
  const isFiltered = statusFilter !== "all";
  const statusFilterLabel =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? statusFilter;

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleClearFilters = useCallback(() => setStatusFilter("all"), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Campaigns"
      subtitle="Track lead sources and ROI"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-36")} aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManageCampaigns ? (
          <LoadingButton size="sm" onClick={handleOpenSheet}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create campaign
          </LoadingButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        {isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load campaigns"
            description="The campaign list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : campaigns.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<EmptyReportIllustration />}
            title="No campaigns yet"
            description={
              isFiltered
                ? "No results match your filters."
                : "A campaign groups the leads that came from one push — an ad, an event, an email blast — so you can see what it returned."
            }
            filtersActive={isFiltered}
            onClearFilters={handleClearFilters}
            action={!isFiltered && canManageCampaigns ? { label: "Create campaign", onClick: handleOpenSheet } : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={asRecordValues(campaigns)}
            getRowKey={(row) => String(row.id)}
            onRowClick={(row) => router.push(`/crm/campaigns/${String(row.id)}`)}
            density={density}
            money={money}
            minWidth="900px"
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <CampaignSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
