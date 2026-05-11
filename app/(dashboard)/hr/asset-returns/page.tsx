"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmActionDialog } from "@/features/hr/confirm-action-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, CheckCircle2, Download, Laptop, Eye, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { EmptyDevicesIllustration } from "@/components/illustrations";
import { AssetReturnDetailSheet } from "@/features/hr/assets/asset-return-detail-sheet";

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

const ASSET_TYPES = [
  "Laptop",
  "Phone",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Headset",
  "Access Card",
  "Other",
];
const CONDITIONS = ["Good", "Fair", "Damaged", "Missing"];
const RETURN_STATUSES = ["PENDING", "RETURNED", "DAMAGED", "LOST", "MISSING"] as const;

function statusBadge(
  s: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  if (s === "RETURNED") return "default";
  if (s === "PENDING") return "outline";
  if (s === "MISSING" || s === "LOST") return "destructive";
  return "secondary";
}

export default function AssetReturnsPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const isAdmin =
    session?.user?.role === "CEO" ||
    session?.user?.role === "HR" ||
    session?.user?.role === "ADMIN";

  const { data: items, isLoading } = useQuery({
    queryKey: arKeys.list(),
    queryFn: () => apiClient.get<AssetReturn[]>("/hr/asset-returns"),
  });

  const create = useMutation({
    mutationFn: (data: {
      userId: string;
      assetName: string;
      assetType?: string;
      serialNumber?: string;
      notes?: string;
    }) => apiClient.post<AssetReturn>("/hr/asset-returns", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const markReturned = useMutation({
    mutationFn: ({ id, condition }: { id: number; condition: string }) =>
      apiClient.patch<AssetReturn>(`/hr/asset-returns/${id}`, {
        status: "RETURNED",
        condition,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const updateReturn = useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: number;
      assetName: string;
      userId: string;
      status: (typeof RETURN_STATUSES)[number];
      condition: string | null;
      notes: string | null;
    }) => apiClient.patch<AssetReturn>(`/hr/asset-returns/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const deleteReturn = useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/hr/asset-returns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: arKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [returnId, setReturnId] = useState<number | null>(null);
  const [userId, setUserId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("Laptop");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [detailAr, setDetailAr] = useState<AssetReturn | null>(null);
  const [editAr, setEditAr] = useState<AssetReturn | null>(null);
  const [editName, setEditName] = useState("");
  const [editUserId, setEditUserId] = useState("");
  const [editStatus, setEditStatus] = useState<(typeof RETURN_STATUSES)[number]>("PENDING");
  const [editCondition, setEditCondition] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [deleteAr, setDeleteAr] = useState<AssetReturn | null>(null);

  useEffect(() => {
    if (!editAr) return;
    setEditName(editAr.assetName);
    setEditUserId(editAr.userId);
    setEditStatus(
      (RETURN_STATUSES.includes(editAr.status as (typeof RETURN_STATUSES)[number])
        ? editAr.status
        : "PENDING") as (typeof RETURN_STATUSES)[number],
    );
    setEditCondition(editAr.condition ?? "");
    setEditNotes(editAr.notes ?? "");
  }, [editAr]);

  const handleCreate = useCallback(() => {
    if (!userId.trim() || !assetName.trim()) {
      toast.error("Employee ID and asset name are required");
      return;
    }
    create.mutate(
      {
        userId: userId.trim(),
        assetName: assetName.trim(),
        assetType,
        serialNumber: serialNumber || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Asset return logged");
          setSheetOpen(false);
          setUserId("");
          setAssetName("");
          setAssetType("Laptop");
          setSerialNumber("");
          setNotes("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [userId, assetName, assetType, serialNumber, notes, create]);

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

  const handleSaveEdit = useCallback(() => {
    if (!editAr) return;
    if (!editName.trim() || !editUserId.trim()) {
      toast.error("Employee user ID and asset name are required");
      return;
    }
    updateReturn.mutate(
      {
        id: editAr.id,
        assetName: editName.trim(),
        userId: editUserId.trim(),
        status: editStatus,
        condition: editCondition.trim() || null,
        notes: editNotes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Return record updated");
          setEditAr(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [editAr, editName, editUserId, editStatus, editCondition, editNotes, updateReturn]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteAr) return;
    deleteReturn.mutate(deleteAr.id, {
      onSuccess: () => {
        toast.success("Return record deleted");
        setDeleteAr(null);
        if (detailAr?.id === deleteAr.id) setDetailAr(null);
        if (editAr?.id === deleteAr.id) setEditAr(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteAr, deleteReturn, detailAr?.id, editAr?.id]);

  const buildRows = useCallback(() => {
    return (items ?? []).map((ar) => ({
      employee: ar.employeeName ?? "",
      asset: ar.assetName,
      type: ar.assetType ?? "",
      serialNumber: ar.serialNumber ?? "",
      status: ar.status ?? "PENDING",
      condition: ar.condition ?? "",
      returnedAt: ar.returnedAt ? format(new Date(ar.returnedAt), "yyyy-MM-dd") : "",
      createdAt: ar.createdAt ? format(new Date(ar.createdAt), "yyyy-MM-dd") : "",
      notes: ar.notes ?? "",
    }));
  }, [items]);

  const handleExportExcel = useCallback(async () => {
    if (!items?.length) {
      toast.error("No data to export");
      return;
    }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Asset Returns");

      sheet.columns = [
        { header: "Employee", key: "employee", width: 24 },
        { header: "Asset", key: "asset", width: 28 },
        { header: "Type", key: "type", width: 14 },
        { header: "Serial Number", key: "serialNumber", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Condition", key: "condition", width: 14 },
        { header: "Returned At", key: "returnedAt", width: 14 },
        { header: "Created At", key: "createdAt", width: 14 },
        { header: "Notes", key: "notes", width: 40 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };

      buildRows().forEach((row) => sheet.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asset-returns-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Asset returns exported");
    } catch {
      toast.error("Failed to export asset returns");
    }
  }, [items, buildRows]);

  const handleExportCsv = useCallback(() => {
    if (!items?.length) {
      toast.error("No data to export");
      return;
    }
    try {
      const rows = buildRows();
      const headers = [
        "Employee",
        "Asset",
        "Type",
        "Serial Number",
        "Status",
        "Condition",
        "Returned At",
        "Created At",
        "Notes",
      ];
      const escape = (v: string) => {
        if (v.includes(",") || v.includes('"') || v.includes("\n")) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      };
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          [
            r.employee,
            r.asset,
            r.type,
            r.serialNumber,
            r.status,
            r.condition,
            r.returnedAt,
            r.createdAt,
            r.notes,
          ]
            .map(escape)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asset-returns-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Asset returns exported");
    } catch {
      toast.error("Failed to export asset returns");
    }
  }, [items, buildRows]);

  if (isLoading) {
    return (
      <PageWrapper title="Asset Returns" subtitle="Track company asset returns">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
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
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={!items?.length}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isAdmin && (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Log Return
            </Button>
          )}
        </div>
      }
    >
      <Sheet open={detailAr !== null} onOpenChange={(open) => !open && setDetailAr(null)}>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col gap-0 border-l p-0 sm:max-w-md"
        >
          {detailAr && (
            <>
              <SheetHeader className="shrink-0 space-y-3 border-b bg-muted/20 px-6 py-5 text-left">
                <div className="flex items-start justify-between gap-3 pr-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Asset return
                    </p>
                    <SheetTitle className="text-left text-lg font-semibold leading-snug tracking-tight">
                      {detailAr.assetName}
                    </SheetTitle>
                    <SheetDescription className="text-left text-xs text-muted-foreground">
                      Record #{detailAr.id}
                    </SheetDescription>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge
                      variant={statusBadge(detailAr.status)}
                      className="text-[10px] font-medium tabular-nums"
                    >
                      {detailAr.status ?? "PENDING"}
                    </Badge>
                    {detailAr.assetType && (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {detailAr.assetType}
                      </Badge>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-6 px-6 py-5">
                  <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <User className="h-3.5 w-3.5" aria-hidden />
                      Assigned to
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold leading-tight">
                        {detailAr.employeeName ?? detailAr.userId}
                      </p>
                      {detailAr.employeeName ? (
                        <p className="break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
                          {detailAr.userId}
                        </p>
                      ) : null}
                    </div>
                  </section>

                  <section className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Package className="h-3.5 w-3.5" aria-hidden />
                      Asset
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DetailBlock label="Name">{detailAr.assetName}</DetailBlock>
                      <DetailBlock label="Condition">
                        <span className="font-medium">{detailAr.condition ?? "—"}</span>
                      </DetailBlock>
                      {detailAr.serialNumber ? (
                        <DetailBlock label="Serial number" className="sm:col-span-2">
                          <span className="font-mono text-[13px]">{detailAr.serialNumber}</span>
                        </DetailBlock>
                      ) : null}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                      Remarks
                    </div>
                    <div className="rounded-md border border-dashed bg-muted/30 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                      {detailAr.notes?.trim() ? (
                        <p className="whitespace-pre-wrap text-foreground">{detailAr.notes}</p>
                      ) : (
                        <p className="italic">No remarks</p>
                      )}
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      Timeline
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(["returnedAt", "createdAt"] as const).map((key) => {
                        const raw = key === "returnedAt" ? detailAr.returnedAt : detailAr.createdAt;
                        const label = key === "returnedAt" ? "Returned" : "Logged";
                        const { date, time } = formatDetailDateTime(raw);
                        return (
                          <div
                            key={key}
                            className="rounded-lg border bg-muted/20 px-3 py-3"
                          >
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {label}
                            </p>
                            <p className="mt-1 text-sm font-semibold tabular-nums">{date}</p>
                            {time ? (
                              <p className="text-xs text-muted-foreground tabular-nums">{time}</p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </ScrollArea>

              <SheetFooter className="shrink-0 flex-col gap-2 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setDetailAr(null)}
                >
                  Close
                </Button>
                {isAdmin ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        const ar = detailAr;
                        setDetailAr(null);
                        setEditAr(ar);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 sm:w-auto"
                      onClick={() => {
                        const ar = detailAr;
                        setDetailAr(null);
                        setDeleteAr(ar);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </>
                ) : null}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <HrSheet
        open={editAr !== null}
        onOpenChange={(open) => !open && setEditAr(null)}
        title="Edit return"
        description="Update asset, assignee, status, condition, and remarks."
        onSubmit={handleSaveEdit}
        submitLabel="Save"
        isPending={updateReturn.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="edit-ar-name">Asset name</Label>
          <Input
            id="edit-ar-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={updateReturn.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-ar-user">Employee user ID</Label>
          <Input
            id="edit-ar-user"
            value={editUserId}
            onChange={(e) => setEditUserId(e.target.value)}
            disabled={updateReturn.isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={editStatus}
            onValueChange={(v) => setEditStatus(v as (typeof RETURN_STATUSES)[number])}
            disabled={updateReturn.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RETURN_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Condition</Label>
          <Select
            value={editCondition || "none"}
            onValueChange={(v) => setEditCondition(v === "none" ? "" : v)}
            disabled={updateReturn.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not set</SelectItem>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-ar-notes">Remarks</Label>
          <Textarea
            id="edit-ar-notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
            disabled={updateReturn.isPending}
          />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={deleteAr !== null}
        onOpenChange={(open) => !open && setDeleteAr(null)}
        title="Delete return record?"
        description={
          deleteAr
            ? `This will permanently remove the return entry for “${deleteAr.assetName}”. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isPending={deleteReturn.isPending}
      />

      {!items?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyDevicesIllustration className="mx-auto mb-4 h-40 w-40 opacity-95" />
            <p className="text-sm text-muted-foreground">No asset returns tracked.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((ar: AssetReturn) => (
            <Card key={ar.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <Laptop className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{ar.assetName}</p>
                    {ar.assetType && (
                      <Badge variant="outline" className="text-[10px]">
                        {ar.assetType}
                      </Badge>
                    )}
                    <Badge variant={statusBadge(ar.status)} className="text-[10px]">
                      {ar.status ?? "PENDING"}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    {(ar.employeeName || ar.userId) && (
                      <span>{ar.employeeName ?? ar.userId}</span>
                    )}
                    {ar.serialNumber && <span>S/N: {ar.serialNumber}</span>}
                    {ar.condition && <span>Condition: {ar.condition}</span>}
                    {ar.createdAt && (
                      <span>{format(new Date(ar.createdAt), "MMM d, yyyy")}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label="View details"
                    onClick={() => setDetailAr(ar)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        aria-label="Edit"
                        onClick={() => setEditAr(ar)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        aria-label="Delete"
                        onClick={() => setDeleteAr(ar)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {ar.status !== "RETURNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs ml-1"
                          onClick={() => setReturnId(ar.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Received
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Log Asset Return"
        onSubmit={handleCreate}
        submitLabel="Log"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Employee User ID</label>
          <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Asset Name</label>
          <Input
            placeholder="e.g., MacBook Pro 16"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Asset Type</label>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Serial Number</label>
            <Input
              placeholder="S/N"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            placeholder="Any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </HrSheet>

      <ConfirmActionDialog
        open={returnId !== null}
        onOpenChange={(open) => {
          if (!open) setReturnId(null);
        }}
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
