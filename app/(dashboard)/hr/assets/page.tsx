"use client";

import { useState, useCallback } from "react";
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
  ChevronsUpDown,
  Check,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { DatePicker } from "@/components/ui/date-picker";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useHrAssets,
  useCreateAsset,
  useUpdateAsset,
  useAssignAsset,
  useHrEmployees,
} from "@/lib/api/hooks";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Asset, AssetStatus, Employee } from "@/types/hr";
import { EmptyDevicesIllustration } from "@/components/illustrations";

function fmtCost(amount: string | number | null) {
  if (amount === null || amount === undefined) return "—";
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Available", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  ASSIGNED: { label: "Assigned", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  MAINTENANCE: { label: "Maintenance", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  RETIRED: { label: "Retired", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
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
    .refine((v) => /[a-zA-Z]/.test(v.trim()), "Brand must contain at least one letter"),
  model: z
    .string()
    .min(1, "Model is required")
    .max(100, "Model is too long"),
  serialNumber: z
    .string()
    .min(3, "Serial number must be at least 3 characters")
    .max(100, "Serial number is too long")
    .refine((v) => /[a-zA-Z0-9]/.test(v.trim()), "Must contain alphanumeric characters"),
  purchaseDate: z.string().optional(),
  purchaseCost: z.string().optional(),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssignDialogState {
  assetId: number;
  assetName: string;
  currentAssignedTo: string | null;
}

function EmployeeCombobox({
  employees,
  value,
  onChange,
  placeholder = "Select employee",
}: {
  employees: Employee[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = employees.filter((emp) => {
    const name = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());
  });

  const selected = employees.find((e) => e.id === value);

  const handleSelect = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const handleOpenChange = useCallback((o: boolean) => {
    setOpen(o);
    if (!o) setSearch("");
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected
              ? `${selected.firstName ?? ""} ${selected.lastName ?? ""}`.trim() || selected.email
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={emp.id}
                  onSelect={() => handleSelect(emp.id)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === emp.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {`${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.email}
                    </span>
                    {emp.designation && (
                      <span className="text-xs text-muted-foreground">{emp.designation}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
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
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Name <span className="text-destructive">*</span></FormLabel>
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
                <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ASSET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
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
                <FormLabel>Serial Number <span className="text-destructive">*</span></FormLabel>
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
                <FormLabel>Brand <span className="text-destructive">*</span></FormLabel>
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
                <FormLabel>Model <span className="text-destructive">*</span></FormLabel>
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
                <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick date" />
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
                  <Input type="number" placeholder="0" {...field} />
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
                <Textarea placeholder="Optional notes..." rows={2} {...field} />
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
  const [assignDialog, setAssignDialog] = useState<AssignDialogState | null>(null);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [assignPending, setAssignPending] = useState(false);

  const { data, isLoading } = useHrAssets();
  const { data: employeesRaw } = useHrEmployees(undefined);
  const employees = (employeesRaw ?? []) as Employee[];

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const assignAsset = useAssignAsset();

  const items: Asset[] = Array.isArray(data) ? data : [];
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
      purchaseCost: "",
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
          purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
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
        purchaseCost: asset.purchaseCost ?? "",
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
          purchaseCost: values.purchaseCost ? Number(values.purchaseCost) : undefined,
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

  const handleStatusChange = useCallback(
    (assetId: number, status: string) => {
      updateAsset.mutate(
        { assetId, status: status as AssetStatus },
        { onError: (e) => toast.error(getErrorMessage(e)) },
      );
    },
    [updateAsset],
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
          toast.success(assignEmpId ? "Asset assigned to employee" : "Asset unassigned");
          setAssignDialog(null);
          setAssignEmpId("");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
        onSettled: () => setAssignPending(false),
      },
    );
  }, [assignDialog, assignEmpId, assignAsset]);

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
                ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.email
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

  return (
    <PageWrapper
      title="Assets & Devices"
      subtitle="Register company assets and manage employee assignments"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!items.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button size="sm" onClick={handleOpenAdd}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Register Asset
          </Button>
        </div>
      }
      filters={
        <Tabs
          value={statusFilter ?? "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}
        >
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
            <TabsTrigger value="AVAILABLE" className="text-xs px-3 h-7">Available</TabsTrigger>
            <TabsTrigger value="ASSIGNED" className="text-xs px-3 h-7">Assigned</TabsTrigger>
            <TabsTrigger value="MAINTENANCE" className="text-xs px-3 h-7">Maintenance</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Assets" value={counts.total} icon={Package} color="blue" />
          <StatCard label="Available" value={counts.available} icon={CheckCircle2} color="green" />
          <StatCard label="Assigned" value={counts.assigned} icon={Laptop} color="amber" />
          <StatCard label="Maintenance" value={counts.maintenance} icon={Wrench} color="red" />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <div className="h-4 rounded bg-muted animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center justify-center gap-2 py-12">
                          <EmptyDevicesIllustration className="h-36 w-36 opacity-95" />
                          <p className="text-muted-foreground text-sm">No assets found.</p>
                          <Button size="sm" variant="outline" onClick={handleOpenAdd}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Register first asset
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((asset) => {
                      const badge = STATUS_BADGE[asset.status ?? "AVAILABLE"] ?? {
                        label: asset.status ?? "—",
                        className: "",
                      };
                      const assignedEmployee = employees.find((e) => e.id === asset.assignedTo);
                      const assignedName = assignedEmployee
                        ? `${assignedEmployee.firstName ?? ""} ${assignedEmployee.lastName ?? ""}`.trim() ||
                          assignedEmployee.email
                        : null;

                      return (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{asset.name}</p>
                              {(asset.brand || asset.model) && (
                                <p className="text-xs text-muted-foreground">
                                  {[asset.brand, asset.model].filter(Boolean).join(" · ")}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px]">
                              {asset.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {asset.serialNumber ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={asset.status ?? "AVAILABLE"}
                              onValueChange={(v) => handleStatusChange(asset.id, v)}
                            >
                              <SelectTrigger className="h-7 w-auto border-0 p-0 shadow-none gap-1 focus:ring-0">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                                    badge.className,
                                  )}
                                >
                                  {badge.label}
                                </span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AVAILABLE">Available</SelectItem>
                                <SelectItem value="ASSIGNED">Assigned</SelectItem>
                                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                <SelectItem value="RETIRED">Retired</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm">
                            {assignedName ? (
                              <span className="text-foreground">{assignedName}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">Unassigned</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {fmtCost(asset.purchaseCost)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {asset.purchaseDate
                              ? format(new Date(asset.purchaseDate), "dd MMM yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title={asset.assignedTo ? "Reassign / Unassign" : "Assign Employee"}
                                onClick={() => handleOpenAssign(asset)}
                              >
                                {asset.assignedTo ? (
                                  <UserMinus className="h-3.5 w-3.5" />
                                ) : (
                                  <UserPlus className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Edit asset"
                                onClick={() => handleOpenEdit(asset)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                title="Retire asset"
                                onClick={() => setDeleteAssetId(asset.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
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
              {assignDialog?.currentAssignedTo ? "Reassign Asset" : "Assign Asset"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Asset: <span className="font-medium text-foreground">{assignDialog?.assetName}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {assignDialog?.currentAssignedTo ? "Reassign to Employee" : "Assign to Employee"}
              </label>
              <EmployeeCombobox
                employees={employees}
                value={assignEmpId}
                onChange={setAssignEmpId}
                placeholder="Select employee"
              />
            </div>
            {assignDialog?.currentAssignedTo && (
              <p className="text-xs text-muted-foreground">
                Leave selection empty and confirm to unassign the current employee.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            {assignDialog?.currentAssignedTo && (
              <Button
                variant="outline"
                onClick={() => {
                  setAssignEmpId("");
                  handleConfirmAssign();
                }}
                disabled={assignPending}
              >
                Unassign
              </Button>
            )}
            <Button onClick={handleConfirmAssign} disabled={assignPending || (!assignEmpId && !assignDialog?.currentAssignedTo)}>
              {assignPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {assignDialog?.currentAssignedTo && assignEmpId ? "Reassign" : "Assign"}
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
