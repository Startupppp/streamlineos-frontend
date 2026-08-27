"use client";

import { useCallback, useMemo, type MouseEvent } from "react";
import { useCanState } from "@/hooks/api/access";
import { useRouter } from "next/navigation";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDealsIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { RecordList, asRecordValues, type RecordValue } from "@/features/renderer";
import { dealRecordFields } from "@/lib/renderer/crm/deal-layout";
import { useCrmStages } from "@/hooks/api/crm/metadata";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { CrmPipelineStage } from "@/types/crm/metadata";
import type { Deal } from "@/types/crm";
import type { DensityMode } from "@/lib/design-tokens";
import { AIPredictDealButton } from "./ai-predict-deal-button";
import { useDealLayout } from "./use-deal-layout";

/**
 * The deal list.
 *
 * No table is written here. The columns, their alignment, the stage badge and
 * the mobile card all come from `DEAL_LAYOUT`; what is left is what a
 * description cannot say — who may move a deal, and where the pipeline is.
 *
 * The table this replaces changed a stage through a `<Select>` that only
 * appeared on double-click, which is a control most people never found. The
 * engine has no editable cells and should not: a row renders a record, it does
 * not write one. The capability moved to the row-actions menu, where every other
 * per-row action in the product already lives, and it goes through the same
 * handler the board does — so the won/lost prompt and the stage-skip
 * confirmation still fire.
 */

const PAGE_SIZE = 25;

interface DealRowActionsProps {
  deal: RecordValue;
  stages: readonly CrmPipelineStage[];
  canUpdate: boolean;
  onStageChange: (dealId: number, stage: string) => void;
}

function DealRowActions({ deal, stages, canUpdate, onStageChange }: DealRowActionsProps) {
  const dealId = Number(deal.id);
  const stage = typeof deal.stage === "string" ? deal.stage : "";
  const name = typeof deal.name === "string" ? deal.name : "this deal";

  const handleStageChange = useCallback(
    (next: string) => onStageChange(dealId, next),
    [dealId, onStageChange],
  );

  const stopRowClick = useCallback((event: MouseEvent) => event.stopPropagation(), []);

  return (
    <div className="flex items-center justify-end gap-1" onClick={stopRowClick}>
      <AIPredictDealButton dealId={dealId} compact />

      {canUpdate && stages.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton
              icon={EllipsisIcon}
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={`Change the stage of ${name}`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={stage} onValueChange={handleStageChange}>
              {stages.map((option) => (
                <DropdownMenuRadioItem key={option.key} value={option.key}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

export interface DealListProps {
  deals: Deal[];
  isLoading: boolean;
  isError: boolean;
  density: DensityMode;
  canCreate: boolean;
  canUpdate: boolean;
  activeFilterLabels: string[];
  onRetry: () => void;
  onClearFilters: () => void;
  onCreateDeal: () => void;
  onStageChange: (dealId: number, stage: string) => void;
}

export function DealList({
  deals,
  isLoading,
  isError,
  density,
  canCreate,
  canUpdate,
  activeFilterLabels,
  onRetry,
  onClearFilters,
  onCreateDeal,
  onStageChange,
}: DealListProps) {
  const router = useRouter();
  const layout = useDealLayout();
  const money = useOrgDisplay();
  const { data: stages } = useCrmStages("deal");

  const rows = useMemo(() => asRecordValues(deals.map(dealRecordFields)), [deals]);

  const handleRowClick = useCallback(
    (row: RecordValue) => router.push(`/crm/deals/${String(row.id)}`),
    [router],
  );

  const renderActions = useCallback(
    (row: RecordValue) => (
      <DealRowActions
        deal={row}
        stages={stages ?? []}
        canUpdate={canUpdate}
        onStageChange={onStageChange}
      />
    ),
    [stages, canUpdate, onStageChange],
  );

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
  if (useCanState("crm:leads:view") === "denied")
    return <NoPermissionState permission="crm:leads:view" />;

  if (isLoading)
    return <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />;

  if (isError)
    return (
      <ErrorState
        title="Couldn't load deals"
        description="The deal list didn't load. Check your connection and try again."
        onRetry={onRetry}
        className={CONTENT_FILL_PANEL}
      />
    );

  const isFiltered = activeFilterLabels.length > 0;

  if (rows.length === 0)
    return (
      <EmptyState
        illustration={<EmptyDealsIllustration />}
        title={isFiltered ? "No deals match these filters" : "No deals yet"}
        description={
          isFiltered
            ? `Filtering by ${activeFilterLabels.join(", ")}. Clear the filters to see every deal.`
            : "A deal tracks one opportunity through your pipeline — its value, stage and close date. Create one to start forecasting."
        }
        action={
          isFiltered
            ? { label: "Clear filters", onClick: onClearFilters }
            : canCreate
              ? { label: "New deal", onClick: onCreateDeal }
              : undefined
        }
        actionVariant={isFiltered ? "outline" : undefined}
        className={CONTENT_FILL_PANEL}
      />
    );

  return (
    <RecordList
      layout={layout}
      rows={rows}
      getRowKey={(row) => String(row.id)}
      onRowClick={handleRowClick}
      actions={renderActions}
      density={density}
      money={money}
      pagination={{ pageSize: PAGE_SIZE }}
      minWidth="1100px"
      className={CONTENT_FILL_PANEL}
    />
  );
}
