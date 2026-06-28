"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, Laptop, AlertCircle } from "lucide-react";
import { useCan } from "@/lib/api/hooks/access";
import { useHrEmployees, useHrAssets } from "@/lib/api/hooks/hr";
import { cn } from "@/lib/utils";
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

const STATUS_META: Record<string, { label: string; badge: string; accent: string }> = {
  PENDING: {
    label: "Pending",
    badge: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  RETURNED: {
    label: "Returned",
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
    accent: "border-l-emerald-500",
  },
  MISSING: {
    label: "Missing",
    badge: "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
    accent: "border-l-rose-500",
  },
};

const CONDITION_META: Record<string, { badge: string }> = {
  Good: {
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
  },
  Fair: {
    badge: "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
  },
  Poor: {
    badge: "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
  },
};

function AssetReturnActionButton({ id, onMark }: { id: number; onMark: (id: number) => void }) {
  const handleClick = useCallback(() => onMark(id), [id, onMark]);
  return (
    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleClick}>
      <CheckCircle2 className="h-3 w-3" />
      Received
    </Button>
  );
}

export default function AssetReturnsPage() {
  const qc = useQueryClient();
  const isAdmin = useCan("hr:employees:manage");

  const { data: employeesRaw } = useHrEmployees();
  const employees = useMemo<Employee[]>(() => {
    if (Array.isArray(employeesRaw)) return employeesRaw;
    return (employeesRaw as PaginatedEmployees | undefined)?.data ?? [];
  }, [employeesRaw]);

  const employeeOptions = useMemo<ComboboxOption[]>(() =>
    employees
      .filter((e) => e.isActive)
      .map((e) => ({
        value: e.id,
        label: e.firstName && e.lastName ? `${e.firstName} ${e.lastName}` : (e.name ?? e.email),
        sublabel: e.designation ?? e.email,
      })),
    [employees],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [returnId, setReturnId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: allAssets } = useHrAssets();
  const assignedAssets = useMemo<Asset[]>(() => {
    if (!allAssets || !userId) return [];
    return allAssets.filter((a) => a.assignedTo === userId && a.status === "ASSIGNED");
  }, [allAssets, userId]);

  const assetOptions = useMemo<ComboboxOption[]>(() =>
    assignedAssets.map((a) => ({
      value: String(a.id),
      label: a.name,
      sublabel: [a.type, a.serialNumber ? `S/N: ${a.serialNumber}` : null].filter(Boolean).join(" · "),
    })),
    [assignedAssets],
  );

  const selectedAsset = useMemo<Asset | undefined>(
    () => assignedAssets.find((a) => String(a.id) === selectedAssetId),
    [assignedAssets, selectedAssetId],
  );

  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: arKeys.list(),
    queryFn: () => apiClient.get<AssetReturn[]>("/hr/asset-returns"),
  });

  const create = useMutation({
    mutationFn: (data: { userId: string; assetName: string; assetId?: number; notes?: string }) =>
      apiClient.post<AssetReturn>("/hr/asset-returns", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const markReturned = useMutation({
    mutationFn: ({ id, condition }: { id: number; condition: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/asset-returns/${id}`, { status: "RETURNED", condition }),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const handleEmployeeChange = useCallback((id: string) => {
    setUserId(id);
    setSelectedAssetId("");
    setAssetName("");
  }, []);

  const handleAssetChange = useCallback((id: string) => {
    setSelectedAssetId(id);
    const asset = (allAssets ?? []).find((a) => String(a.id) === id);
    setAssetName(asset ? asset.name : "");
  }, [allAssets]);

  const resetSheetState = useCallback(() => {
    setUserId(""); setSelectedAssetId(""); setAssetName(""); setNotes("");
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetSheetState();
    setSheetOpen(open);
  }, [resetSheetState]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleCreate = useCallback(() => {
    if (!userId.trim()) { toast.error("Please select an employee"); return; }
    if (!assetName.trim()) { toast.error("Please select or enter an asset name"); return; }
    create.mutate(
      {
        userId: userId.trim(),
        assetName: assetName.trim(),
        assetId: selectedAsset ? selectedAsset.id : undefined,
        notes: notes || undefined,
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
  }, [userId, assetName, selectedAsset, notes, create, resetSheetState]);

  const handleMarkReturned = useCallback(() => {
    if (!returnId) return;
    markReturned.mutate({ id: returnId, condition: "Good" }, {
      onSuccess: () => { toast.success("Asset marked as returned"); setReturnId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [returnId, markReturned]);

  const handleAssetNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setAssetName(e.target.value), []);
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);
  const handleSetReturnId = useCallback((id: number) => setReturnId(id), []);
  const handleCloseConfirm = useCallback((open: boolean) => { if (!open) setReturnId(null); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  if (isLoading) {
    return (
      <PageWrapper title="Asset Returns" subtitle="Track company asset returns">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-4">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                </div>
                <Skeleton className="h-7 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Asset Returns" subtitle="Track company asset returns">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load asset returns</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRetry}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Asset Returns"
      subtitle="Track and manage company asset returns from employees"
      badge={`${items?.length ?? 0} items`}
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Log Return
          </Button>
        ) : undefined
      }
    >
      {!items?.length ? (
        <EmptyState
          illustration={<Laptop className="h-8 w-8 text-muted-foreground" />}
          title="No asset returns tracked"
          description="Log an asset return when an employee returns company equipment."
          action={isAdmin ? { label: "Log Return", onClick: handleOpenSheet } : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[640px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-foreground/80">Asset</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Employee</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Status</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Condition</TableHead>
                    <TableHead className="font-semibold text-foreground/80">Date</TableHead>
                    {isAdmin && (
                      <TableHead className="font-semibold text-foreground/80 text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((ar: AssetReturn) => {
                    const status = ar.status ?? "PENDING";
                    const statusMeta = STATUS_META[status] ?? STATUS_META.PENDING;
                    const conditionMeta = ar.condition ? CONDITION_META[ar.condition] : null;

                    return (
                      <TableRow key={ar.id} className={cn(
                        "border-l-4 transition-colors duration-200",
                        statusMeta.accent,
                      )}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-950/40 flex items-center justify-center shrink-0">
                              <Laptop className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{ar.assetName}</p>
                              {ar.assetType && (
                                <p className="text-[10px] text-muted-foreground">{ar.assetType}</p>
                              )}
                              {ar.serialNumber && (
                                <p className="text-[10px] font-mono text-muted-foreground">S/N: {ar.serialNumber}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {ar.employeeName ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                            statusMeta.badge,
                          )}>
                            {statusMeta.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          {conditionMeta ? (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                              conditionMeta.badge,
                            )}>
                              {ar.condition}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ar.createdAt ? format(new Date(ar.createdAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {ar.status !== "RETURNED" && (
                              <AssetReturnActionButton id={ar.id} onMark={handleSetReturnId} />
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Log Asset Return"
        onSubmit={handleCreate}
        submitLabel="Log Return"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee <span className="text-destructive">*</span></label>
          <Combobox
            options={employeeOptions}
            value={userId}
            onChange={handleEmployeeChange}
            placeholder="Select employee…"
            searchPlaceholder="Search by name…"
          />
        </div>

        {userId && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Assigned Asset <span className="text-destructive">*</span></label>
            {assetOptions.length > 0 ? (
              <Combobox
                options={assetOptions}
                value={selectedAssetId}
                onChange={handleAssetChange}
                placeholder="Select asset to return…"
                searchPlaceholder="Search assets…"
              />
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                No assets currently assigned to this employee. Enter name manually below.
              </p>
            )}
          </div>
        )}

        {userId && (assetOptions.length === 0 || !selectedAssetId) && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Asset Name <span className="text-destructive">*</span>
              {assetOptions.length > 0 && (
                <span className="text-muted-foreground font-normal text-xs ml-1">(or enter manually)</span>
              )}
            </label>
            <Input
              placeholder="e.g., MacBook Pro 16"
              value={assetName}
              onChange={handleAssetNameChange}
            />
          </div>
        )}

        {selectedAsset && (
          <div className="rounded-xl bg-muted/50 border border-border p-3 text-xs space-y-1">
            <p><span className="font-medium">Type:</span> {selectedAsset.type}</p>
            {selectedAsset.serialNumber && (
              <p><span className="font-medium">Serial Number:</span> {selectedAsset.serialNumber}</p>
            )}
            {selectedAsset.brand && (
              <p><span className="font-medium">Brand:</span> {selectedAsset.brand}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            placeholder="Any notes about condition or return circumstances…"
            value={notes}
            onChange={handleNotesChange}
            rows={2}
            className="resize-none w-full"
          />
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
