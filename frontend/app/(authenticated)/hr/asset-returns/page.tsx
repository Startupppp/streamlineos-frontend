"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, Laptop } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { useAbility } from "@/lib/abilities-context";
import { useHrEmployees, useHrAssets } from "@/lib/api/hooks/hr";
import type { Employee, PaginatedEmployees, Asset } from "@/types/hr";

interface AssetReturn {
  id: number; userId: string; employeeName: string | null; assetName: string;
  assetType: string | null; serialNumber: string | null; condition: string | null;
  status: string | null; notes: string | null; returnedAt: string | null;
  createdAt: string | null;
}

const arKeys = { all: [...queryKeys.hr.all, "asset-returns"] as const, list: () => [...arKeys.all, "list"] as const };


function statusBadge(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "RETURNED") return "default";
  if (s === "PENDING") return "outline";
  if (s === "MISSING") return "destructive";
  return "secondary";
}

export default function AssetReturnsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:employees");
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
    [employees]
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [returnId, setReturnId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");

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
    [assignedAssets]
  );

  const { data: items, isLoading } = useQuery({
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
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [notes, setNotes] = useState("");

  const selectedAsset = useMemo<Asset | undefined>(
    () => assignedAssets.find((a) => String(a.id) === selectedAssetId),
    [assignedAssets, selectedAssetId]
  );

  const handleEmployeeChange = useCallback((id: string) => {
    setUserId(id);
    setSelectedAssetId("");
    setAssetName("");
  }, []);

  const handleAssetChange = useCallback((id: string) => {
    setSelectedAssetId(id);
    const asset = (allAssets ?? []).find((a) => String(a.id) === id);
    if (asset) setAssetName(asset.name);
    else setAssetName("");
  }, [allAssets]);

  const resetSheetState = useCallback(() => {
    setUserId("");
    setSelectedAssetId("");
    setAssetName("");
    setNotes("");
  }, []);

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

  if (isLoading) {
    return (
      <PageWrapper title="Asset Returns" subtitle="Track company asset returns">
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Asset Returns"
      subtitle="Track and manage company asset returns from employees"
      badge={`${items?.length ?? 0} items`}
      actions={isAdmin ? <Button size="sm" onClick={() => setSheetOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" />Log Return</Button> : undefined}
    >
      {!items?.length ? (
        <Card><CardContent className="py-12 text-center">
          <EmptyDevicesIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No asset returns tracked.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((ar: AssetReturn) => (
            <Card key={ar.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Laptop className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{ar.assetName}</p>
                    {ar.assetType && <Badge variant="outline" className="text-[10px]">{ar.assetType}</Badge>}
                    <Badge variant={statusBadge(ar.status)} className="text-[10px]">{ar.status ?? "PENDING"}</Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                    {ar.employeeName && <span>{ar.employeeName}</span>}
                    {ar.serialNumber && <span>S/N: {ar.serialNumber}</span>}
                    {ar.condition && <span>Condition: {ar.condition}</span>}
                    {ar.createdAt && <span>{format(new Date(ar.createdAt), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                {isAdmin && ar.status !== "RETURNED" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReturnId(ar.id)}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />Received
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) resetSheetState();
          setSheetOpen(open);
        }}
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
              onChange={(e) => setAssetName(e.target.value)}
            />
          </div>
        )}

        {selectedAsset && (
          <div className="rounded-md bg-muted/50 border border-border p-3 text-xs space-y-1">
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
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none w-full"
          />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={returnId !== null}
        onOpenChange={(open) => { if (!open) setReturnId(null); }}
        title="Confirm Return"
        description="Mark this asset as returned in good condition?"
        confirmLabel="Confirm"
        onConfirm={handleMarkReturned}
        isPending={markReturned.isPending}
      />
    </PageWrapper>
  );
}
