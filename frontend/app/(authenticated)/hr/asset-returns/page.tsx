"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, Laptop, AlertCircle } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import { useHrEmployees, useHrAssets,
  unwrapEmployees} from "@/hooks/api/hr";
import { cn } from "@/lib/utils";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { Employee, PaginatedEmployees, Asset } from "@/types/hr";

interface AssetReturn {
  id: number;
  userId: string;
  employeeName: string | null;
  assetName: string;
  assetType: string | null;
  serialNumber: string | null;
  condition: string | null;
  status: string | null;
  notes: string | null;
  returnedAt: string | null;
  createdAt: string | null;
}

const arKeys = {
  all: [...queryKeys.hr.all, "asset-returns"] as const,
  list: () => [...arKeys.all, "list"] as const,
};

const STATUS_META: Record<
  string,
  { label: string; badge: string; accent: string }
> = {
  PENDING: {
    label: "Pending",
    badge:
      "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  RETURNED: {
    label: "Returned",
    badge:
      "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
    accent: "border-l-emerald-500",
  },
  MISSING: {
    label: "Missing",
    badge:
      "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
    accent: "border-l-rose-500",
  },
};

const CONDITION_META: Record<string, { badge: string }> = {
  Good: {
    badge:
      "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
  },
  Fair: {
    badge:
      "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
  },
  Poor: {
    badge:
      "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
  },
};

const CONDITIONS = ["Good", "Fair", "Poor"] as const;

function buildAssetReturnColumns(
  isAdmin: boolean,
  onMark: (id: number) => void,
): DataTableColumn<AssetReturn>[] {
  const cols: DataTableColumn<AssetReturn>[] = [
    {
      key: "asset",
      header: "Asset",
      cell: (ar) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <TruncatedText text={ar.assetName} className="text-sm font-semibold text-foreground" />
            {ar.assetType && (
              <p className="text-[10px] text-muted-foreground">
                {ar.assetType}
              </p>
            )}
            {ar.serialNumber && (
              <p className="text-[10px] font-mono text-muted-foreground">
                S/N: {ar.serialNumber}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      cell: (ar) => (
        <span className="text-sm text-foreground">
          {ar.employeeName ?? <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (ar) => {
        const statusMeta =
          STATUS_META[ar.status ?? "PENDING"] ?? STATUS_META.PENDING;
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              statusMeta.badge,
            )}
          >
            {statusMeta.label}
          </span>
        );
      },
      sortable: true,
      sortValue: (ar) => ar.status ?? "",
    },
    {
      key: "condition",
      header: "Condition",
      cell: (ar) => {
        const conditionMeta = ar.condition
          ? CONDITION_META[ar.condition]
          : null;
        return conditionMeta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              conditionMeta.badge,
            )}
          >
            {ar.condition}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      key: "date",
      header: "Date",
      cell: (ar) => (
        <span className="text-xs text-muted-foreground">
          {ar.createdAt ? format(new Date(ar.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
      sortable: true,
      sortValue: (ar) => ar.createdAt ?? "",
    },
  ];

  if (isAdmin) {
    cols.push({
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (ar) =>
        ar.status !== "RETURNED" ? (
          <AssetReturnActionButton id={ar.id} onMark={onMark} />
        ) : null,
    });
  }

  return cols;
}

function AssetReturnActionButton({
  id,
  onMark,
}: {
  id: number;
  onMark: (id: number) => void;
}) {
  const handleClick = useCallback(() => onMark(id), [id, onMark]);
  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs gap-1.5"
      onClick={handleClick}
    >
      <CheckCircle2 className="h-3 w-3" />
      Received
    </Button>
  );
}

export default function AssetReturnsPage() {
  const qc = useQueryClient();
  const isAdmin = useCan("hr:employees:manage");

  const { data: employeesRaw } = useHrEmployees({ limit: 200 });
  const employees = useMemo<Employee[]>(() => {
    if (Array.isArray(employeesRaw)) return employeesRaw;
    return (employeesRaw as PaginatedEmployees | undefined)?.data ?? [];
  }, [employeesRaw]);

  const { data: allAssets } = useHrAssets();

  const allAssignedAssets = useMemo<Asset[]>(() => {
    if (!allAssets) return [];
    return allAssets.filter((a) => a.status === "ASSIGNED" && !!a.assignedTo);
  }, [allAssets]);

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

  const selectedAsset = useMemo<Asset | undefined>(
    () => allAssignedAssets.find((a) => String(a.id) === selectedAssetId),
    [allAssignedAssets, selectedAssetId],
  );

  const resolvedUserId = overrideUserId ?? selectedAsset?.assignedTo ?? "";

  const resolvedEmployee = useMemo<Employee | null>(
    () => employees.find((e) => e.id === resolvedUserId) ?? null,
    [employees, resolvedUserId],
  );

  const employeeOptions = useMemo<ComboboxOption[]>(
    () =>
      employees
        .filter((e) => e.isActive)
        .map((e) => ({
          value: e.id,
          label: getUserDisplayName(e),
          sublabel: e.designation ?? e.email,
        })),
    [employees],
  );

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: arKeys.list(),
    queryFn: () => apiClient.get<AssetReturn[]>("/hr/asset-returns"),
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: (data: {
      userId: string;
      assetName: string;
      assetId?: number;
      condition?: string;
      notes?: string;
    }) => apiClient.post<AssetReturn>("/hr/asset-returns", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const markReturned = useMutation({
    mutationFn: ({ id, condition: cond }: { id: number; condition: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/asset-returns/${id}`, {
        status: "RETURNED",
        condition: cond,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const handleAssetChange = useCallback((id: string) => {
    setSelectedAssetId(id);
    setOverrideUserId(null);
  }, []);

  const handleEmployeeOverrideChange = useCallback((id: string) => {
    setOverrideUserId(id || null);
  }, []);

  const handleNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNotes(val);
      if (val.length > 1000) {
        setNotesError(
          `Notes must be at most 1000 characters (${val.length}/1000)`,
        );
      } else {
        setNotesError("");
      }
    },
    [],
  );

  const resetSheetState = useCallback(() => {
    setSelectedAssetId("");
    setOverrideUserId(null);
    setCondition("");
    setNotes("");
    setNotesError("");
  }, []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) resetSheetState();
      setSheetOpen(open);
    },
    [resetSheetState],
  );

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleCreate = useCallback(() => {
    if (!selectedAssetId) {
      toast.error("Please select an asset to return");
      return;
    }
    if (!resolvedUserId) {
      toast.error("Please select an employee");
      return;
    }
    if (!condition) {
      toast.error("Please select the asset condition");
      return;
    }
    if (notes.length > 1000) {
      toast.error("Notes must be at most 1000 characters");
      return;
    }
    const asset = allAssignedAssets.find(
      (a) => String(a.id) === selectedAssetId,
    );
    if (!asset) return;
    create.mutate(
      {
        userId: resolvedUserId,
        assetName: asset.name,
        assetId: asset.id,
        condition,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Asset return logged");
          setSheetOpen(false);
          resetSheetState();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [
    selectedAssetId,
    resolvedUserId,
    condition,
    notes,
    allAssignedAssets,
    create,
    resetSheetState,
  ]);

  const handleMarkReturned = useCallback(() => {
    if (!returnId) return;
    markReturned.mutate(
      { id: returnId, condition: "Good" },
      {
        onSuccess: () => {
          toast.success("Asset marked as returned");
          setReturnId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [returnId, markReturned]);

  const handleSetReturnId = useCallback((id: number) => setReturnId(id), []);
  const handleCloseConfirm = useCallback((open: boolean) => {
    if (!open) setReturnId(null);
  }, []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Asset Returns" subtitle="Track company asset returns" variant="display">
        <div className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-4 w-24 rounded-md" />{" "}
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Asset Returns" subtitle="Track company asset returns" variant="display">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Failed to load asset returns
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Something went wrong. Please try again.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const employeeAutoFilled = !!selectedAsset?.assignedTo && !overrideUserId;

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
      <DataTable<AssetReturn>
        className="flex-1 min-h-0"
        data={items ?? []}
        columns={buildAssetReturnColumns(isAdmin, handleSetReturnId)}
        getRowKey={(row) => row.id}
        rowClassName={(ar) => {
          const statusMeta =
            STATUS_META[ar.status ?? "PENDING"] ?? STATUS_META.PENDING;
          return cn("border-l-4", statusMeta.accent);
        }}
        minWidth="640px"
        emptyState={
          <div className="flex flex-1 min-h-0 w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card py-14 px-6 text-center">
            <div className="h-28 w-28">
              <EmptyDevicesIllustration />
            </div>
            <div>
              <p className="text-[0.9375rem] font-semibold text-foreground">
                No asset returns tracked
              </p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Log an asset return when an employee returns company equipment.
              </p>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={handleOpenSheet} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Log Return
              </Button>
            )}
          </div>
        }
      />

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Log Asset Return"
        description="Select the asset being returned. The employee will be auto-filled from the assignment."
        onSubmit={handleCreate}
        submitLabel="Log Return"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Asset <span className="text-destructive">*</span>
          </label>
          <Combobox
            options={assetOptions}
            value={selectedAssetId}
            onChange={handleAssetChange}
            placeholder="Select assigned asset to return…"
            searchPlaceholder="Search assets…"
          />
          {allAssignedAssets.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No currently assigned assets found.
            </p>
          )}
        </div>

        {selectedAsset && (
          <div className="rounded-xl bg-muted/50 border border-border p-3 text-xs space-y-1">
            <p>
              <span className="font-medium">Type:</span> {selectedAsset.type}
            </p>
            {selectedAsset.serialNumber && (
              <p>
                <span className="font-medium">Serial Number:</span>{" "}
                {selectedAsset.serialNumber}
              </p>
            )}
            {selectedAsset.brand && (
              <p>
                <span className="font-medium">Brand:</span>{" "}
                {selectedAsset.brand}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Employee <span className="text-destructive">*</span>
            {employeeAutoFilled && resolvedEmployee && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                (auto-filled from assignment)
              </span>
            )}
          </label>
          {employeeAutoFilled && resolvedEmployee ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                {getUserDisplayName(resolvedEmployee)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground"
                onClick={() => setOverrideUserId(resolvedEmployee.id)}
              >
                Change
              </Button>
            </div>
          ) : (
            <Combobox
              options={employeeOptions}
              value={resolvedUserId}
              onChange={handleEmployeeOverrideChange}
              placeholder="Select employee…"
              searchPlaceholder="Search by name…"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Condition <span className="text-destructive">*</span>
          </label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger>
              <SelectValue placeholder="Select condition…" />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Notes
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({notes.length}/1000)
            </span>
          </label>
          <Textarea
            placeholder="Any notes about the condition or return circumstances…"
            value={notes}
            onChange={handleNotesChange}
            rows={3}
            className="resize-none w-full"
            maxLength={1000}
          />
          {notesError && (
            <p className="text-xs text-destructive">{notesError}</p>
          )}
        </div>
      </HrSheet>

      <ConfirmDialog
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
