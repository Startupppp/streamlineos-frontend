"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { RecordList, asRecordValues } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { CAMPAIGN_LAYOUT } from "@/lib/renderer/crm/campaign-layout";
import { useCampaigns } from "@/hooks/api/crm/campaigns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCan, useCanState } from "@/hooks/api/access";
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

const PAGE_SIZE = 20;

export function CampaignListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const layout = useTenantLayout(CAMPAIGN_LAYOUT);
  const money = useOrgDisplay();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [density, setDensity] = useDensity();
  const canManageCampaigns = useCan("crm:campaigns:manage");
  const canViewReports = useCan("crm:reports:view");

  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading, isError, refetch } = useCampaigns({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    limit: PAGE_SIZE,
  });

  const campaigns = data?.items ?? [];
  const total = data?.total ?? 0;
  const isFiltered = statusFilter !== "all";
  const statusFilterLabel =
    STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? statusFilter;

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);
  const handleClearFilters = useCallback(() => {
    setStatusFilter("all");
    updateParams({ page: null });
  }, [updateParams]);
  const handleStatusFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      updateParams({ page: null });
    },
    [updateParams],
  );
  const handlePageChange = useCallback(
    (next: number) => updateParams({ page: next > 1 ? String(next) : null }),
    [updateParams],
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:campaigns:view") === "denied")
    return <NoPermissionState permission="crm:campaigns:view" />;

  return (
    <PageWrapper
      title="Campaigns"
      subtitle="Track lead sources and ROI"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
        <div className="flex items-center gap-gap-toolbar">
          {/*
            CRM-P1-01. The multi-touch report had no way in at all — the only
            attribution on screen was first-touch and last-touch, the two models
            that make the strongest claim about which single touch mattered.
            Gated on the report key, so somebody who cannot read reports is not
            offered a link that 403s.
          */}
          {canViewReports ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/crm/campaigns/attribution">Attribution</Link>
            </Button>
          ) : null}
          {canManageCampaigns ? (
            <LoadingButton size="sm" onClick={handleOpenSheet}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create campaign
            </LoadingButton>
          ) : null}
        </div>
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
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total,
              onPageChange: handlePageChange,
            }}
            className={CONTENT_FILL_PANEL}
          />
        )}
      </div>

      <CampaignSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </PageWrapper>
  );
}
