"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { useHrEmployees, useHrAssetList, unwrapEmployees } from "@/hooks/api/hr";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/person-display";
import type { ComboboxOption } from "@/components/ui/combobox";
import type { Asset } from "@/types/hr";
import {
  STATUS_META,
  type AssetReturn,
} from "@/features/hr/asset-returns/asset-return-constants";
import { buildAssetReturnColumns } from "@/features/hr/asset-returns/asset-return-columns";
import { AssetReturnLogSheet, type AssetReturnFieldErrors } from "@/features/hr/asset-returns/asset-return-log-sheet";
import { AssetReturnsEmptyState } from "@/features/hr/asset-returns/asset-return-page-states";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import {
  useAssetReturns,
  useCreateAssetReturn,
  useMarkAssetReturned,
} from "@/hooks/api/hr/asset-returns";

export function AssetReturnsPage() {
  // Backend POST/PATCH /hr/asset-returns require hr:assets:manage (assets.controller.ts).
  const isAdmin = useCan("hr:assets:manage");

  const { data: employeesRaw } = useHrEmployees({ limit: 100 });
  const employees = useMemo(() => unwrapEmployees(employeesRaw), [employeesRaw]);

  const { data: assignedAssetsData } = useHrAssetList({ status: "ASSIGNED", limit: 100 });

  const allAssignedAssets = useMemo<Asset[]>(() => {
    const rows = assignedAssetsData?.data ?? [];
    return rows.filter((a) => !!a.assignedTo);
  }, [assignedAssetsData]);

  const assetOptions = useMemo<ComboboxOption[]>(
    () =>
      allAssignedAssets.map((a) => {
        const emp = employees.find((e) => e.id === a.assignedTo) ?? null;
        const empLabel = emp ? getUserDisplayName(emp) : null;
        return {
          value: String(a.id),
          label: a.name,
          sublabel: [
            a.type,
            a.serialNumber ? `S/N: ${a.serialNumber}` : null,
            empLabel ? `Assigned to ${empLabel}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        };
      }),
    [allAssignedAssets, employees],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [returnId, setReturnId] = useState<number | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [overrideUserId, setOverrideUserId] = useState<string | null>(null);
  const [condition, setCondition] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AssetReturnFieldErrors>({});

  const selectedAsset = useMemo<Asset | undefined>(
    () => allAssignedAssets.find((a) => String(a.id) === selectedAssetId),
    [allAssignedAssets, selectedAssetId],
  );

  const resolvedUserId = overrideUserId ?? selectedAsset?.assignedTo ?? "";

  const resolvedEmployee = useMemo(
    () => employees.find((e) => e.id === resolvedUserId) ?? null,
    [employees, resolvedUserId],
  );

  const { data: items, isLoading, isError, error, refetch } = useAssetReturns();
  const pageState = usePageState({ permission: "hr:assets:view", isLoading, isError, error });

  const create = useCreateAssetReturn();
  const markReturned = useMarkAssetReturned();

  const resetSheetState = useCallback(() => {
    setSelectedAssetId("");
    setOverrideUserId(null);
    setCondition("");
    setNotes("");
    setNotesError("");
    setFieldErrors({});
  }, []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetSheetState();
      setSheetOpen(open);
    },
    [resetSheetState],
  );

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleAssetChange = useCallback((id: string) => {
    setSelectedAssetId(id);
    setOverrideUserId(null);
    setFieldErrors((prev) => ({ ...prev, asset: undefined, employee: undefined }));
  }, []);

  const handleEmployeeOverrideChange = useCallback((id: string) => {
    setOverrideUserId(id || null);
    setFieldErrors((prev) => ({ ...prev, employee: undefined }));
  }, []);

  const handleConditionChange = useCallback((value: string) => {
    setCondition(value);
    setFieldErrors((prev) => ({ ...prev, condition: undefined }));
  }, []);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNotes(val);
      setNotesError(
        val.length > 1000
          ? `Notes must be at most 1000 characters (${val.length}/1000)`
          : "",
      );
    },
    [],
  );

  const handleCreate = useCallback(() => {
    const errors: AssetReturnFieldErrors = {
      asset: selectedAssetId ? undefined : "Select the asset being returned",
      employee: resolvedUserId ? undefined : "Select the employee returning it",
      condition: condition ? undefined : "Select the asset's condition",
    };
    setFieldErrors(errors);
    if (errors.asset || errors.employee || errors.condition || notes.length > 1000) return;
    const asset = allAssignedAssets.find((a) => String(a.id) === selectedAssetId);
    if (!asset) return;
    create.mutate(
      { userId: resolvedUserId, assetName: asset.name, assetId: asset.id, condition, notes: notes.trim() || undefined },
      {
        onSuccess: () => { toast.success("Asset return logged"); setSheetOpen(false); resetSheetState(); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [selectedAssetId, resolvedUserId, condition, notes, allAssignedAssets, create, resetSheetState]);

  const handleMarkReturned = useCallback(() => {
    if (!returnId) return;
    markReturned.mutate(
      { assetReturnId: returnId, condition: "Good" },
      {
        onSuccess: () => { toast.success("Asset marked as returned"); setReturnId(null); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [returnId, markReturned]);

  const handleSetReturnId = useCallback((id: number) => setReturnId(id), []);
  const handleCloseConfirm = useCallback((open: boolean) => { if (!open) setReturnId(null); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <PageWrapper
      title="Asset Returns"
      subtitle="Track and manage company asset returns from employees"
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Log Return
          </Button>
        ) : undefined
      }
    >
      <PageState resolution={pageState} loading={<DataTableSkeleton />} onRetry={handleRetry} className="flex-1">
      <DataTable<AssetReturn>
        className="flex-1 min-h-0"
        data={items ?? []}
        columns={buildAssetReturnColumns(isAdmin, handleSetReturnId)}
        getRowKey={(row) => row.id}
        rowClassName={(ar) => {
          const statusMeta = STATUS_META[ar.status ?? "PENDING"] ?? STATUS_META.PENDING;
          return cn("border-l-4", statusMeta.accent);
        }}
        minWidth="640px"
        emptyState={<AssetReturnsEmptyState isAdmin={isAdmin} onOpenSheet={handleOpenSheet} />}
      />
      </PageState>

      <AssetReturnLogSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        assetOptions={assetOptions}
        allAssignedAssets={allAssignedAssets}
        selectedAssetId={selectedAssetId}
        resolvedUserId={resolvedUserId}
        resolvedEmployee={resolvedEmployee}
        overrideUserId={overrideUserId}
        condition={condition}
        notes={notes}
        notesError={notesError}
        fieldErrors={fieldErrors}
        isPending={create.isPending}
        onAssetChange={handleAssetChange}
        onEmployeeOverrideChange={handleEmployeeOverrideChange}
        onConditionChange={handleConditionChange}
        onNotesChange={handleNotesChange}
        onOverrideUserId={setOverrideUserId}
        onSubmit={handleCreate}
      />

      <ConfirmSheet
        open={returnId !== null}
        onOpenChange={handleCloseConfirm}
        title="Confirm Return"
        description="Mark this asset as returned in good condition?"
        confirmLabel="Confirm"
        onConfirm={handleMarkReturned}
        isPending={markReturned.isPending}
      />
    </PageWrapper>
  );
}
