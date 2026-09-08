"use client";

import { useState, useCallback, useMemo } from "react";
import { Package, CheckCircle2, Laptop, Wrench, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useCursorPager } from "@/components/ui/table-pagination";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { useQueryClient } from "@tanstack/react-query";
import {
  useHrAssetList,
  useCreateAsset,
  useUpdateAsset,
  useAssignAsset,
  useHrEmployees,
  unwrapEmployees,
} from "@/hooks/api";
import { hrAssetListPrefix } from "@/hooks/api/hr/assets";
import { AccessRequestsTab } from "@/features/hr/assets/access-requests-tab";
import { useCan } from "@/hooks/api/access";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { Asset } from "@/types/hr";
import type { AssetFormValues } from "@/features/hr/assets/asset-schema";
import { type AssignDialogState } from "@/features/hr/assets/asset-constants";
import {
  AddAssetSheet,
  EditAssetSheet,
  useAssetForm,
  useEditAssetForm,
} from "@/features/hr/assets/asset-form-sheet";
import { AssignAssetSheet } from "@/features/hr/assets/assign-asset-sheet";
import { buildAssetColumns } from "@/features/hr/assets/asset-columns";
import { exportAssetsToXlsx } from "@/features/hr/assets/export-assets";
import { AssetFilterToolbar } from "@/features/hr/assets/asset-filter-toolbar";
import { AssetTableSection } from "@/features/hr/assets/asset-table-section";

const PAGE_SIZE = 20;

export function AssetsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [assignmentFilter, setAssignmentFilter] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<number | null>(null);
  const [assignDialog, setAssignDialog] = useState<AssignDialogState | null>(null);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignPending, setAssignPending] = useState(false);

  const qc = useQueryClient();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const assignAsset = useAssignAsset();
  const canManageAssets = useCan("hr:assets:manage");
  const pager = useCursorPager();
  const { data, isLoading, isError, refetch } = useHrAssetList({
    cursor: pager.cursor,
    limit: PAGE_SIZE,
    status: statusFilter,
  });
  const { data: employeesRaw } = useHrEmployees(undefined);

  const employees = useMemo(() => unwrapEmployees(employeesRaw), [employeesRaw]);
  const addForm = useAssetForm();
  const editForm = useEditAssetForm();

  const invalidateAssetList = useCallback(() => {
    void qc.invalidateQueries({ queryKey: hrAssetListPrefix });
  }, [qc]);

  const items = useMemo<Asset[]>(() => data?.data ?? [], [data]);
  const filteredItems = useMemo(() => {
    let result = items;
    if (categoryFilter) result = result.filter((a) => a.type === categoryFilter);
    if (assignmentFilter === "assigned") result = result.filter((a) => !!a.assignedTo);
    if (assignmentFilter === "unassigned") result = result.filter((a) => !a.assignedTo);
    return result;
  }, [items, categoryFilter, assignmentFilter]);

  const hasMore = data?.pagination.hasMore ?? false;
  const nextCursor = data?.pagination.nextCursor ?? null;
  const counts = data?.counts ?? { total: 0, available: 0, assigned: 0, maintenance: 0, retired: 0 };

  const handleOpenAdd = useCallback(() => {
    addForm.reset();
    setAddOpen(true);
  }, [addForm]);

  const handleCloseAdd = useCallback(
    (open: boolean) => {
      if (!open) { setAddOpen(false); addForm.reset(); }
    },
    [addForm],
  );

  const handleCreateSubmit = useCallback(
    (values: AssetFormValues) => {
      createAsset.mutate(
        {
          name: values.name,
          type: values.type,
          brand: values.brand,
          model: values.model,
          serialNumber: values.serialNumber,
          purchaseDate: values.purchaseDate || undefined,
          purchaseCost: values.purchaseCost,
          location: values.location || undefined,
          notes: values.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Asset registered successfully");
            invalidateAssetList();
            setAddOpen(false);
            addForm.reset();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createAsset, addForm, invalidateAssetList],
  );

  const handleOpenEdit = useCallback(
    (asset: Asset) => {
      setEditAsset(asset);
      editForm.reset({
        name: asset.name,
        type: asset.type,
        brand: asset.brand ?? "",
        model: asset.model ?? "",
        serialNumber: asset.serialNumber ?? "",
        purchaseDate: asset.purchaseDate ?? "",
        purchaseCost: asset.purchaseCost != null ? Number(asset.purchaseCost) : undefined,
        location: asset.location ?? "",
        notes: asset.notes ?? "",
      });
    },
    [editForm],
  );

  const handleCloseEdit = useCallback((open: boolean) => {
    if (!open) setEditAsset(null);
  }, []);

  const handleEditSubmit = useCallback(
    (values: AssetFormValues) => {
      if (!editAsset) return;
      updateAsset.mutate(
        {
          assetId: editAsset.id,
          name: values.name,
          type: values.type,
          brand: values.brand,
          model: values.model,
          serialNumber: values.serialNumber,
          purchaseDate: values.purchaseDate || undefined,
          purchaseCost: values.purchaseCost,
          location: values.location || undefined,
          notes: values.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Asset updated");
            invalidateAssetList();
            setEditAsset(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [editAsset, updateAsset, invalidateAssetList],
  );

  const handleOpenAssign = useCallback((asset: Asset) => {
    setAssignDialog({ assetId: asset.id, assetName: asset.name, currentAssignedTo: asset.assignedTo });
    setAssignEmpId(asset.assignedTo ?? "");
  }, []);

  const handleCloseAssign = useCallback((open: boolean) => {
    if (!open) { setAssignDialog(null); setAssignEmpId(""); }
  }, []);

  const handleConfirmAssign = useCallback(() => {
    if (!assignDialog) return;
    setAssignPending(true);
    assignAsset.mutate(
      { assetId: assignDialog.assetId, assignedTo: assignEmpId || null },
      {
        onSuccess: () => {
          toast.success(assignEmpId ? "Asset assigned to employee" : "Asset unassigned");
          invalidateAssetList();
          setAssignDialog(null);
          setAssignEmpId("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
        onSettled: () => setAssignPending(false),
      },
    );
  }, [assignDialog, assignEmpId, assignAsset, invalidateAssetList]);

  const handleUnassign = useCallback(() => {
    if (!assignDialog) return;
    setAssignPending(true);
    assignAsset.mutate(
      { assetId: assignDialog.assetId, assignedTo: null },
      {
        onSuccess: () => {
          toast.success("Asset unassigned");
          invalidateAssetList();
          setAssignDialog(null);
          setAssignEmpId("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
        onSettled: () => setAssignPending(false),
      },
    );
  }, [assignDialog, assignAsset, invalidateAssetList]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteAssetId === null) return;
    updateAsset.mutate(
      { assetId: deleteAssetId, status: "RETIRED" },
      {
        onSuccess: () => {
          toast.success("Asset retired");
          invalidateAssetList();
          setDeleteAssetId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteAssetId, updateAsset, invalidateAssetList]);

  const handleCloseDelete = useCallback((open: boolean) => {
    if (!open) setDeleteAssetId(null);
  }, []);

  const handleSetDeleteId = useCallback((id: number) => setDeleteAssetId(id), []);

  const handleExport = useCallback(async () => {
    try {
      const { count, filtered } = await exportAssetsToXlsx(employees, {
        statusFilter,
        categoryFilter,
        assignmentFilter,
      });
      toast.success(filtered ? `Exported ${count} filtered assets` : "Assets exported");
    } catch {
      toast.error("Export failed");
    }
  }, [employees, statusFilter, categoryFilter, assignmentFilter]);

  const handleStatusFilterChange = useCallback((v: string) => {
    setStatusFilter(v === "all" ? undefined : v);
    pager.reset();
  }, [pager]);

  const handleNextPage = useCallback(() => {
    pager.goNext(nextCursor);
  }, [pager, nextCursor]);

  const handleCategoryFilterChange = useCallback((v: string) => {
    setCategoryFilter(v === "all" ? undefined : v);
  }, []);

  const handleAssignmentFilterChange = useCallback((v: string) => {
    setAssignmentFilter(v === "all" ? undefined : v);
  }, []);

  function handleRetry() { void refetch(); }

  const columns = useMemo(
    () => buildAssetColumns(employees, handleOpenAssign, handleOpenEdit, handleSetDeleteId, canManageAssets),
    [employees, handleOpenAssign, handleOpenEdit, handleSetDeleteId, canManageAssets],
  );

  return (
    <PageWrapper
      title="Assets & Devices"
      subtitle="Register company assets and manage employee assignments"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={!filteredItems.length}
            title={statusFilter || categoryFilter || assignmentFilter ? "Export filtered assets" : "Export all assets"}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleOpenAdd}>
            <Plus className="h-3.5 w-3.5" />
            Register Asset
          </Button>
        </div>
      }
      filters={
        <AssetFilterToolbar
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          assignmentFilter={assignmentFilter}
          onStatusChange={handleStatusFilterChange}
          onCategoryChange={handleCategoryFilterChange}
          onAssignmentChange={handleAssignmentFilterChange}
        />
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total Assets" value={counts.total} icon={Package} color="blue" />
          <StatCard label="Available" value={counts.available} icon={CheckCircle2} color="green" />
          <StatCard label="Assigned" value={counts.assigned} icon={Laptop} color="amber" />
          <StatCard label="Maintenance" value={counts.maintenance} icon={Wrench} color="red" />
        </StatCardGrid>

        <AssetTableSection
          filteredItems={filteredItems}
          columns={columns}
          isLoading={isLoading}
          isError={isError}
          hasMore={hasMore}
          hasPrevious={pager.hasPrevious}
          statusFilter={statusFilter}
          onNextPage={handleNextPage}
          onPreviousPage={pager.goPrevious}
          onRetry={handleRetry}
          onOpenAdd={handleOpenAdd}
        />

        <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden">
          <CardContent className="p-4">
            <AccessRequestsTab employees={employees} canManage={canManageAssets} />
          </CardContent>
        </Card>
      </div>

      <AddAssetSheet
        open={addOpen}
        onOpenChange={handleCloseAdd}
        form={addForm}
        assets={items}
        isPending={createAsset.isPending}
        onSubmit={handleCreateSubmit}
      />

      <EditAssetSheet
        editAsset={editAsset}
        onOpenChange={handleCloseEdit}
        form={editForm}
        assets={items}
        isPending={updateAsset.isPending}
        onSubmit={handleEditSubmit}
      />

      <AssignAssetSheet
        assignDialog={assignDialog}
        assignEmpId={assignEmpId}
        assignPending={assignPending}
        onOpenChange={handleCloseAssign}
        onEmpChange={setAssignEmpId}
        onConfirmAssign={handleConfirmAssign}
        onUnassign={handleUnassign}
      />

      <ConfirmSheet
        open={deleteAssetId !== null}
        onOpenChange={handleCloseDelete}
        title="Retire Asset"
        description="Are you sure you want to retire this asset? Its status will be set to Retired."
        confirmLabel="Retire"
        destructive
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
