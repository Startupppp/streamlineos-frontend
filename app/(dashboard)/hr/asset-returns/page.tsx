"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, Clock, Laptop } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface AssetReturn {
  id: number; userId: string; employeeName: string | null; assetName: string;
  assetType: string | null; serialNumber: string | null; condition: string | null;
  status: string | null; notes: string | null; returnedAt: string | null;
  createdAt: string | null;
}

const arKeys = { all: [...queryKeys.hr.all, "asset-returns"] as const, list: () => [...arKeys.all, "list"] as const };

const ASSET_TYPES = ["Laptop", "Phone", "Monitor", "Keyboard", "Mouse", "Headset", "Access Card", "Other"];
const CONDITIONS = ["Good", "Fair", "Damaged", "Missing"];

function statusBadge(s: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (s === "RETURNED") return "default";
  if (s === "PENDING") return "outline";
  if (s === "MISSING") return "destructive";
  return "secondary";
}

export default function AssetReturnsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin = session?.user?.role === "CEO" || session?.user?.role === "HR";

  const { data: items, isLoading } = useQuery({
    queryKey: arKeys.list(),
    queryFn: () => apiClient.get<AssetReturn[]>("/hr/asset-returns"),
  });

  const create = useMutation({
    mutationFn: (data: { userId: string; assetName: string; assetType?: string; serialNumber?: string; notes?: string }) =>
      apiClient.post<AssetReturn>("/hr/asset-returns", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const markReturned = useMutation({
    mutationFn: ({ id, condition }: { id: number; condition: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/asset-returns/${id}`, { status: "RETURNED", condition }),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [returnId, setReturnId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("Laptop");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const handleCreate = useCallback(() => {
    if (!userId.trim() || !assetName.trim()) { toast.error("Employee ID and asset name are required"); return; }
    create.mutate(
      { userId: userId.trim(), assetName: assetName.trim(), assetType, serialNumber: serialNumber || undefined, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Asset return logged"); setSheetOpen(false);
          setUserId(""); setAssetName(""); setAssetType("Laptop"); setSerialNumber(""); setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, assetName, assetType, serialNumber, notes, create]);

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
          <Image
            src="/illustrations/undraw-online-survey.svg"
            alt="No asset returns"
            width={200}
            height={160}
            className="mx-auto mb-4 opacity-90"
          />
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

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Log Asset Return" onSubmit={handleCreate} submitLabel="Log" isPending={create.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee User ID</label>
          <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Asset Name</label>
          <Input placeholder="e.g., MacBook Pro 16" value={assetName} onChange={(e) => setAssetName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Asset Type</label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Serial Number</label>
            <Input placeholder="S/N" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea placeholder="Any notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={returnId !== null}
        onOpenChange={(open) => { if (!open) setReturnId(null); }}
        title="Confirm Return"
        description="Mark this asset as returned in good condition?"
        confirmLabel="Confirm"
        variant="default"
        onConfirm={handleMarkReturned}
        isPending={markReturned.isPending}
      />
    </PageWrapper>
  );
}
