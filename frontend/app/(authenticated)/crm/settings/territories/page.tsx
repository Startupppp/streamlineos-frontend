"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { CONTENT_FILL_PANEL, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { RecordList } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { RecordRowActions } from "@/features/crm/settings/shared/record-row-actions";
import { TerritorySheet } from "@/features/crm/settings/territory-sheet";
import { TerritoryPreviewPanel } from "@/features/crm/settings/territory-preview-panel";
import { useCan } from "@/hooks/api/access";
import { useDeleteTerritory, useTerritories, useUpdateTerritory } from "@/hooks/api/crm-settings";
import { getErrorMessage } from "@/lib/get-error-message";
import { TERRITORY_LAYOUT } from "@/lib/renderer/crm/settings/territory-layout";
import type { Territory } from "@/hooks/api/crm-settings";

/**
 * Territories.
 *
 * The table is generated, so the criteria shown in it are the criteria stored —
 * the screen this replaces built a "Criteria" string with a helper that read
 * three of the eight and printed "No criteria" for the rest.
 *
 * Activating and deactivating stays a one-click switch in the row rather than a
 * trip through the edit sheet: it is one field on a record already on screen,
 * which is the bottom rung of the overlay ladder and needs no overlay at all.
 */
export default function TerritoriesPage() {
  const layout = useTenantLayout(TERRITORY_LAYOUT);
  const [density, setDensity] = useDensity();
  const canManage = useCan("crm:territories:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Territory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Territory | null>(null);

  const { data, isLoading, isError, refetch, access} = useTerritories();
  const updateTerritory = useUpdateTerritory();
  const deleteTerritory = useDeleteTerritory();

  const territories = useMemo(() => data ?? [], [data]);

  const rows = useMemo(
    () =>
      territories.map((territory) => ({
        id: territory.id,
        name: territory.name,
        description: territory.description ?? "",
        priority: territory.priority,
        isActive: territory.isActive,
        countries: territory.criteria.countries ?? [],
        states: territory.criteria.states ?? territory.states,
        cities: territory.criteria.cities ?? territory.cities,
        postalCodes: territory.criteria.postalCodes ?? [],
        industries: territory.criteria.industries ?? [],
        companySizes: territory.criteria.companySizes ?? [],
        productKeys: territory.criteria.productKeys ?? [],
        accountTypes: territory.criteria.accountTypes ?? [],
      })),
    [territories],
  );

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleToggleActive = useCallback(
    (territory: Territory) => {
      updateTerritory.mutate(
        { id: territory.id, isActive: !territory.isActive },
        {
          onSuccess: () =>
            toast.success(territory.isActive ? "Territory paused" : "Territory activated"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateTerritory],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteTerritory.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Territory deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteTarget(null);
      },
    });
  }, [deleteTerritory, deleteTarget]);

  const rowActions = useCallback(
    (row: Record<string, unknown>) => {
      const territory = territories.find((candidate) => candidate.id === row.id);
      if (!territory || !canManage) return null;
      return (
        <RecordRowActions
          editLabel={`Edit ${territory.name}`}
          deleteLabel={`Delete ${territory.name}`}
          leading={
            <Switch
              checked={territory.isActive}
              onCheckedChange={() => handleToggleActive(territory)}
              aria-label={
                territory.isActive
                  ? `Pause ${territory.name}`
                  : `Activate ${territory.name}`
              }
            />
          }
          onEdit={() => {
            setEditTarget(territory);
            setSheetOpen(true);
          }}
          onDelete={() => setDeleteTarget(territory)}
        />
      );
    },
    [territories, canManage, handleToggleActive],
  );

  return (
    <PageWrapper
      title="Territories"
      subtitle="Which reps cover which customers, and how a lead finds them."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New territory
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-gap-section">
        {!canManage ? (
          <NoPermissionState
            permission="crm:territories:manage"
            className={CONTENT_FILL_PANEL}
            description="Territory routing is managed by your sales operations team."
          />
        ) : isLoading ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load territories"
            description="The territory list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<EmptyTargetIllustration />}
            title="No territories yet"
            description="A territory is a rule that sends a new lead to the reps who cover it — by state, by city, by industry, by account type."
            action={{ label: "New territory", onClick: handleOpenCreate }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <>
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.id)}
              actions={rowActions}
              density={density}
              minWidth="880px"
              className={CONTENT_FILL_PANEL}
            />
            <TerritoryPreviewPanel />
          </>
        )}
      </div>

      <TerritorySheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        territory={editTarget}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this territory?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be deleted and new leads will stop being routed by it. Leads already assigned keep their owner. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete territory"
        destructive
        isPending={deleteTerritory.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
