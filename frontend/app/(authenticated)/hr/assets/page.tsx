"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Package,
  CheckCircle2,
  Laptop,
  Wrench,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  useHrAssets,
  useCreateAsset,
  useUpdateAsset,
  useAssignAsset,
  useHrEmployees,
} from "@/hooks/api";
import { AccessRequestsTab } from "@/features/hr/assets/access-requests-tab";
import { useCan } from "@/hooks/api/access";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Asset, Employee } from "@/types/hr";

function fmtCost(amount: string | number | null) {
  if (amount === null || amount === undefined) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  AVAILABLE: {
    label: "Available",
    badge:
      "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
  },
  ASSIGNED: {
    label: "Assigned",
    badge:
      "bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300",
  },
  MAINTENANCE: {
    label: "Maintenance",
    badge:
      "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/40 dark:border-amber-800 dark:text-amber-300",
  },
  RETIRED: {
    label: "Retired",
    badge:
      "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
  },
};

const ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Phone",
  "Tablet",
  "Headset",
  "Keyboard",
  "Mouse",
  "Other",
];

const assetFormSchema = z.object({
  name: z
    .string()
    .min(2, "Asset name must be at least 2 characters")
    .max(100, "Asset name is too long")
    .refine((v) => v === v.trim(), "No leading or trailing spaces")
    .refine((v) => !/\s{2,}/.test(v), "No consecutive spaces")
    .refine((v) => /[a-zA-Z]/.test(v), "Must contain at least one letter")
    .refine((v) => !/^[\d\s]+$/.test(v), "Cannot be numeric only")
    .refine(
      (v) => !/[!@#$%^&*()\-_=+\[\]{};:'",.<>?/\\|`~]{2,}/.test(v),
      "Cannot contain multiple consecutive special characters",
    ),
  type: z.string().min(1, "Type is required"),
  brand: z
    .string()
    .min(1, "Brand is required")
    .max(100, "Brand is too long")
    .refine(
      (v) => /[a-zA-Z]/.test(v.trim()),
      "Brand must contain at least one letter",
    ),
  model: z.string().min(1, "Model is required").max(100, "Model is too long"),
  serialNumber: z
    .string()
    .min(3, "Serial number must be at least 3 characters")
    .max(100, "Serial number is too long")
    .refine(
      (v) => /[a-zA-Z0-9]/.test(v.trim()),
      "Must contain alphanumeric characters",
    ),
  purchaseDate: z.string().optional(),
  purchaseCost: z
    .number()
    .min(0, "Cost cannot be negative")
    .max(9_999_999, "Cost exceeds maximum")
    .multipleOf(0.01, "Maximum 2 decimal places")
    .optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssignDialogState {
  assetId: number;
  assetName: string;
  currentAssignedTo: string | null;
}

function buildEmployeeOptions(employees: Employee[]): ComboboxOption[] {
  return employees.map((emp) => ({
    value: emp.id,
    label: `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.email,
    sublabel: emp.designation ?? emp.email,
  }));
}

function ASSET_COLUMNS(
  employees: Employee[],
  onAssign: (asset: Asset) => void,
  onEdit: (asset: Asset) => void,
  onRetire: (id: number) => void,
  canManage: boolean,
): DataTableColumn<Asset>[] {
  return [
    {
      key: "name",
      header: "Asset",
      cell: (asset) => (
        <div>
          <p className="font-semibold text-sm text-foreground">{asset.name}</p>
          {(asset.brand || asset.model) && (
            <p className="text-xs text-muted-foreground">
              {[asset.brand, asset.model].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      ),
      sortable: true,
      sortValue: (a) => a.name,
    },
    {
      key: "type",
      header: "Type",
      cell: (asset) => (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300">
          {asset.type}
        </span>
      ),
    },
    {
      key: "serialNumber",
      header: "Serial #",
      cell: (asset) => (
        <span className="font-mono text-xs text-muted-foreground">
          {asset.serialNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (asset) => {
        const meta = STATUS_META[asset.status ?? "AVAILABLE"] ?? STATUS_META.AVAILABLE;
        return (
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", meta.badge)}>
            {meta.label}
          </span>
        );
      },
      sortable: true,
      sortValue: (a) => a.status ?? "",
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      cell: (asset) => {
        const assignedEmployee = employees.find((e) => e.id === asset.assignedTo);
        const assignedName = assignedEmployee
          ? `${assignedEmployee.firstName ?? ""} ${assignedEmployee.lastName ?? ""}`.trim() || assignedEmployee.email
          : null;
        const assignedInitial = assignedName?.[0]?.toUpperCase() ?? "?";
        return assignedName ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                {assignedInitial}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-foreground truncate max-w-[120px]">{assignedName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Unassigned</span>
        );
      },
    },
    {
      key: "purchaseCost",
      header: "Cost",
      headerClassName: "text-right",
      className: "text-right",
      cell: (asset) => (
        <span className="text-sm font-medium">{fmtCost(asset.purchaseCost)}</span>
      ),
      sortable: true,
      sortValue: (a) => Number(a.purchaseCost ?? 0),
    },
    {
      key: "purchaseDate",
      header: "Purchased",
      cell: (asset) => (
        <span className="text-xs text-muted-foreground">
          {asset.purchaseDate ? format(new Date(asset.purchaseDate), "dd MMM yyyy") : "—"}
        </span>
      ),
      sortable: true,
      sortValue: (a) => a.purchaseDate ?? "",
    },
    ...(canManage ? [{
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (asset: Asset) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={asset.assignedTo ? "Reassign / Unassign" : "Assign Employee"}
            onClick={(e) => { e.stopPropagation(); onAssign(asset); }}
          >
            {asset.assignedTo ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Edit asset"
            onClick={(e) => { e.stopPropagation(); onEdit(asset); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Retire asset"
            onClick={(e) => { e.stopPropagation(); onRetire(asset.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    }] as DataTableColumn<Asset>[] : []),
  ];
}

function AssetForm({
  form,
  assets: existingAssets,
  currentAssetId,
  isPending,
  submitLabel,
  onSubmit,
}: {
  form: ReturnType<typeof useForm<AssetFormValues>>;
  assets: Asset[];
  currentAssetId?: number;
  isPending: boolean;
  submitLabel: string;
  onSubmit: (values: AssetFormValues) => void;
}) {
  const handleFormSubmit = useCallback(
    (values: AssetFormValues) => {
      const normalizedSerial = values.serialNumber.trim().toLowerCase();
      const duplicate = existingAssets.find(
        (a) =>
          a.serialNumber?.trim().toLowerCase() === normalizedSerial &&
          a.id !== currentAssetId,
      );
      if (duplicate) {
        form.setError("serialNumber", {
          message: "An asset with this serial number already exists.",
        });
        return;
      }
      onSubmit(values);
    },
    [existingAssets, currentAssetId, form, onSubmit],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Asset Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. MacBook Pro 16-inch" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Type <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Serial Number <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="SN123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Brand <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Apple" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Model <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="M3 Pro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
                <DatePicker
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Pick date"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="purchaseCost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Cost (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    min={0}
                    step={0.01}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Bangalore Office" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional notes..."
                  rows={2}
                  className="resize-none w-full"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full mt-2" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}

export default function HrAssetsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<number | null>(null);
  const [assignDialog, setAssignDialog] = useState<AssignDialogState | null>(
    null,
  );
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignPending, setAssignPending] = useState(false);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const assignAsset = useAssignAsset();
  const canManageAssets = useCan("hr:assets:manage");
  const { data, isLoading, isError, refetch } = useHrAssets();
  const { data: employeesRaw } = useHrEmployees(undefined);

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : []) as Employee[],
    [employeesRaw],
  );
  const employeeOptions = buildEmployeeOptions(employees);

  const items = useMemo<Asset[]>(() => (Array.isArray(data) ? data : []), [data]);
  const filteredItems = statusFilter
    ? items.filter((a) => a.status === statusFilter)
    : items;

  const counts = items.reduce(
    (acc, a) => {
      if (a.status === "AVAILABLE") acc.available++;
      else if (a.status === "ASSIGNED") acc.assigned++;
      else if (a.status === "MAINTENANCE") acc.maintenance++;
      acc.total++;
      return acc;
    },
    { total: 0, available: 0, assigned: 0, maintenance: 0 },
  );

  const addForm = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: "",
      type: "Laptop",
      brand: "",
      model: "",
      serialNumber: "",
      purchaseDate: "",
      purchaseCost: undefined,
      location: "",
      notes: "",
    },
    mode: "onBlur",
  });

  const editForm = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    mode: "onBlur",
  });

  const handleOpenAdd = useCallback(() => {
    addForm.reset();
    setAddOpen(true);
  }, [addForm]);

  const handleCloseAdd = useCallback(
    (open: boolean) => {
      if (!open) {
        setAddOpen(false);
        addForm.reset();
      }
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
            setAddOpen(false);
            addForm.reset();
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [createAsset, addForm],
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
        purchaseCost:
          asset.purchaseCost != null ? Number(asset.purchaseCost) : undefined,
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
            setEditAsset(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [editAsset, updateAsset],
  );

  const handleOpenAssign = useCallback((asset: Asset) => {
    setAssignDialog({
      assetId: asset.id,
      assetName: asset.name,
      currentAssignedTo: asset.assignedTo,
    });
    setAssignEmpId(asset.assignedTo ?? "");
  }, []);

  const handleCloseAssign = useCallback((open: boolean) => {
    if (!open) {
      setAssignDialog(null);
      setAssignEmpId("");
    }
  }, []);

  const handleConfirmAssign = useCallback(() => {
    if (!assignDialog) return;
    setAssignPending(true);
    assignAsset.mutate(
      { assetId: assignDialog.assetId, assignedTo: assignEmpId || null },
      {
        onSuccess: () => {
          toast.success(
            assignEmpId ? "Asset assigned to employee" : "Asset unassigned",
          );
          setAssignDialog(null);
          setAssignEmpId("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
        onSettled: () => setAssignPending(false),
      },
    );
  }, [assignDialog, assignEmpId, assignAsset]);

  const handleUnassign = useCallback(() => {
    setAssignEmpId("");
    handleConfirmAssign();
  }, [handleConfirmAssign]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteAssetId === null) return;
    updateAsset.mutate(
      { assetId: deleteAssetId, status: "RETIRED" },
      {
        onSuccess: () => {
          toast.success("Asset retired");
          setDeleteAssetId(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteAssetId, updateAsset]);

  const handleCloseDelete = useCallback((open: boolean) => {
    if (!open) setDeleteAssetId(null);
  }, []);

  const handleSetDeleteId = useCallback(
    (id: number) => setDeleteAssetId(id),
    [],
  );

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      await downloadXlsx("assets-export.xlsx", [
        {
          name: "Assets",
          columns: [
            { header: "Asset Name", key: "name", width: 24 },
            { header: "Type", key: "type", width: 12 },
            { header: "Brand", key: "brand", width: 14 },
            { header: "Model", key: "model", width: 14 },
            { header: "Serial Number", key: "serialNumber", width: 20 },
            { header: "Status", key: "status", width: 12 },
            { header: "Assigned To", key: "assignedTo", width: 22 },
            { header: "Purchase Cost", key: "purchaseCost", width: 14 },
            { header: "Purchase Date", key: "purchaseDate", width: 14 },
            { header: "Location", key: "location", width: 18 },
          ],
          rows: items.map((a) => {
            const emp = employees.find((e) => e.id === a.assignedTo);
            return {
              name: a.name,
              type: a.type,
              brand: a.brand ?? "",
              model: a.model ?? "",
              serialNumber: a.serialNumber ?? "",
              status: a.status ?? "AVAILABLE",
              assignedTo: emp
                ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() ||
                  emp.email
                : "",
              purchaseCost: a.purchaseCost ?? "",
              purchaseDate: a.purchaseDate
                ? format(new Date(a.purchaseDate), "yyyy-MM-dd")
                : "",
              location: a.location ?? "",
            };
          }),
        },
      ]);
      toast.success("Assets exported");
    } catch {
      toast.error("Export failed");
    }
  }, [items, employees]);

  const handleStatusFilterChange = useCallback((v: string) => {
    setStatusFilter(v === "all" ? undefined : v);
  }, []);

  function handleRetry() { void refetch(); }

  return (
    <PageWrapper
      title="Assets & Devices"
      subtitle="Register company assets and manage employee assignments"
      badge={`${items.length} assets`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={!items.length}
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
        <Select
          value={statusFilter ?? "all"}
          onValueChange={handleStatusFilterChange}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="RETIRED">Retired</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Assets"
            value={counts.total}
            icon={Package}
            color="blue"
          />
          <StatCard
            label="Available"
            value={counts.available}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            label="Assigned"
            value={counts.assigned}
            icon={Laptop}
            color="amber"
          />
          <StatCard
            label="Maintenance"
            value={counts.maintenance}
            icon={Wrench}
            color="red"
          />
        </div>

        {isError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card shadow-sm py-16 gap-4">
            <p className="text-sm font-semibold text-foreground">Failed to load assets</p>
            <p className="text-xs text-muted-foreground">Something went wrong.</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>Try Again</Button>
          </div>
        ) : (
          <DataTable<Asset>
            data={filteredItems}
            columns={ASSET_COLUMNS(employees, handleOpenAssign, handleOpenEdit, handleSetDeleteId, canManageAssets)}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            minWidth="900px"
            emptyState={
              <EmptyState
                illustration={<Package className="h-8 w-8 text-muted-foreground" />}
                title="No assets found"
                description={
                  statusFilter
                    ? `No ${statusFilter.toLowerCase()} assets.`
                    : "Register your first company asset."
                }
                action={
                  !statusFilter
                    ? { label: "Register Asset", onClick: handleOpenAdd }
                    : undefined
                }
                compact
              />
            }
          />
        )}

        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <AccessRequestsTab employees={employees} canManage={canManageAssets} />
          </CardContent>
        </Card>
      </div>

      <HrSheet
        open={addOpen}
        onOpenChange={handleCloseAdd}
        title="Register Asset"
        description="Register a new company asset. Employee assignment can be done after creation."
        showSubmit={false}
      >
        <AssetForm
          form={addForm}
          assets={items}
          isPending={createAsset.isPending}
          submitLabel="Register Asset"
          onSubmit={handleCreateSubmit}
        />
      </HrSheet>

      <HrSheet
        open={editAsset !== null}
        onOpenChange={handleCloseEdit}
        title="Edit Asset"
        description="Update asset details. Use the assign button in the table to change employee assignment."
        showSubmit={false}
      >
        <AssetForm
          form={editForm}
          assets={items}
          currentAssetId={editAsset?.id}
          isPending={updateAsset.isPending}
          submitLabel="Save Changes"
          onSubmit={handleEditSubmit}
        />
      </HrSheet>

      <Dialog open={assignDialog !== null} onOpenChange={handleCloseAssign}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {assignDialog?.currentAssignedTo
                ? "Reassign Asset"
                : "Assign Asset"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Asset:{" "}
              <span className="font-medium text-foreground">
                {assignDialog?.assetName}
              </span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {assignDialog?.currentAssignedTo
                  ? "Reassign to Employee"
                  : "Assign to Employee"}
              </label>
              <Combobox
                key={assignDialog?.assetId ?? "closed"}
                options={employeeOptions}
                value={assignEmpId}
                onChange={setAssignEmpId}
                placeholder="Select employee…"
                searchPlaceholder="Search by name or email…"
              />
            </div>
            {assignDialog?.currentAssignedTo && (
              <p className="text-xs text-muted-foreground">
                Leave selection empty and confirm to unassign the current
                employee.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            {assignDialog?.currentAssignedTo && (
              <Button
                variant="outline"
                onClick={handleUnassign}
                disabled={assignPending}
              >
                Unassign
              </Button>
            )}
            <Button
              onClick={handleConfirmAssign}
              disabled={
                assignPending ||
                (!assignEmpId && !assignDialog?.currentAssignedTo)
              }
            >
              {assignPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {assignDialog?.currentAssignedTo && assignEmpId
                ? "Reassign"
                : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
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
