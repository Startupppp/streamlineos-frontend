"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration } from "@/components/illustrations";
import { LoadingState, ErrorState, EntityFormDialog } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Controller } from "react-hook-form";
import {
  useListTaxCodes,
  useCreateTaxCode,
  useUpdateTaxCode,
  useSeedDefaultTaxCodes,
} from "@/hooks/api/accounting/taxes";
import type { TaxCode, TaxType } from "@/types/accounting/taxes";

const TAX_TYPE_OPTIONS: { value: TaxType; label: string }[] = [
  { value: "GST", label: "GST" },
  { value: "CGST_SGST", label: "CGST + SGST" },
  { value: "IGST", label: "IGST" },
  { value: "VAT", label: "VAT" },
  { value: "TDS", label: "TDS" },
  { value: "TCS", label: "TCS" },
  { value: "EXEMPT", label: "Exempt" },
  { value: "ZERO_RATED", label: "Zero Rated" },
];

const TAX_TYPE_BADGE: Record<TaxType, string> = {
  GST: "border-blue-500/30 text-blue-700 bg-blue-500/5",
  CGST_SGST: "border-indigo-500/30 text-indigo-700 bg-indigo-500/5",
  IGST: "border-cyan-500/30 text-cyan-700 bg-cyan-500/5",
  VAT: "border-amber-500/30 text-amber-700 bg-amber-500/5",
  TDS: "border-orange-500/30 text-orange-700 bg-orange-500/5",
  TCS: "border-rose-500/30 text-rose-700 bg-rose-500/5",
  EXEMPT: "border-slate-400/30 text-slate-600 bg-slate-400/5",
  ZERO_RATED: "border-emerald-500/30 text-emerald-700 bg-emerald-500/5",
};

const taxCodeSchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  rate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid rate (e.g. 18 or 5.50)"),
  taxType: z.enum(["GST", "CGST_SGST", "IGST", "VAT", "TDS", "TCS", "EXEMPT", "ZERO_RATED"]),
  isReverseCharge: z.boolean(),
  isActive: z.boolean(),
});

type TaxCodeFormValues = z.infer<typeof taxCodeSchema>;

interface EditState {
  open: boolean;
  code: TaxCode | null;
}

const CLOSED_STATE: EditState = { open: false, code: null };

function buildDefaultValues(code: TaxCode | null): TaxCodeFormValues {
  if (code) {
    return {
      code: code.code,
      name: code.name,
      rate: code.rate,
      taxType: code.taxType,
      isReverseCharge: code.isReverseCharge,
      isActive: code.isActive,
    };
  }
  return {
    code: "",
    name: "",
    rate: "",
    taxType: "GST",
    isReverseCharge: false,
    isActive: true,
  };
}

export default function TaxCodesPage() {
  const canManage = useCan("accounting:taxes:manage");
  const [editState, setEditState] = useState<EditState>(CLOSED_STATE);

  const listQuery = useListTaxCodes({ pageSize: 100 });
  const createMutation = useCreateTaxCode();
  const updateMutation = useUpdateTaxCode(editState.code?.id ?? 0);
  const seedMutation = useSeedDefaultTaxCodes();

  const items = listQuery.data?.items ?? [];

  const handleSeedDefaults = useCallback(() => {
    seedMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(`${data.seeded} default tax codes seeded.`);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }, [seedMutation]);

  const handleAdd = useCallback(() => {
    setEditState({ open: true, code: null });
  }, []);

  const handleEditRow = useCallback((row: TaxCode) => {
    setEditState({ open: true, code: row });
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setEditState(CLOSED_STATE);
  }, []);

  const handleSubmit = useCallback(
    (values: TaxCodeFormValues) => {
      if (editState.code) {
        updateMutation.mutate(values, {
          onSuccess: () => {
            toast.success("Tax code updated.");
            setEditState(CLOSED_STATE);
          },
          onError: (err) => {
            toast.error(getErrorMessage(err));
          },
        });
      } else {
        createMutation.mutate(values, {
          onSuccess: () => {
            toast.success("Tax code created.");
            setEditState(CLOSED_STATE);
          },
          onError: (err) => {
            toast.error(getErrorMessage(err));
          },
        });
      }
    },
    [editState.code, createMutation, updateMutation],
  );

  const handleRetry = useCallback(() => {
    void listQuery.refetch();
  }, [listQuery]);

  const columns: DataTableColumn<TaxCode>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
    },
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="text-sm">{row.name}</span>,
    },
    {
      key: "rate",
      header: "Rate",
      cell: (row) => <span className="text-sm tabular-nums">{row.rate}%</span>,
    },
    {
      key: "taxType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className={TAX_TYPE_BADGE[row.taxType]}>
          {TAX_TYPE_OPTIONS.find((o) => o.value === row.taxType)?.label ?? row.taxType}
        </Badge>
      ),
    },
    {
      key: "isReverseCharge",
      header: "Reverse Charge",
      cell: (row) => (
        <Badge variant="outline" className={row.isReverseCharge ? "border-amber-500/30 text-amber-700 bg-amber-500/5" : "text-muted-foreground"}>
          {row.isReverseCharge ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge
          variant="outline"
          className={row.isActive ? "border-emerald-500/30 text-emerald-700 bg-emerald-500/5" : "text-muted-foreground"}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        canManage ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleEditRow(row);
            }}
          >
            Edit
          </Button>
        ) : null
      ),
    },
  ];

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageWrapper
      eyebrow="Accounting · Taxes"
      title="Tax Codes"
      subtitle="Manage tax codes and rates applied to transactions."
      backHref="/accounting/taxes"
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <LoadingButton
              variant="outline"
              size="sm"
              isPending={seedMutation.isPending}
              loadingText="Seeding…"
              onClick={handleSeedDefaults}
            >
              Seed Defaults
            </LoadingButton>
            <Button size="sm" onClick={handleAdd}>
              Add Tax Code
            </Button>
          </div>
        ) : undefined
      }
    >
      {listQuery.isLoading ? (
        <LoadingState variant="table" rows={8} />
      ) : listQuery.error ? (
        <ErrorState
          title="Failed to load tax codes"
          description={getErrorMessage(listQuery.error)}
          onRetry={handleRetry}
        />
      ) : items.length === 0 ? (
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title="No tax codes yet"
          description="Seed defaults or add your first tax code to get started."
          action={canManage ? { label: "Add Tax Code", onClick: handleAdd } : undefined}
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowKey={(row) => row.id}
          minWidth="640px"
        />
      )}

      <EntityFormDialog
        open={editState.open}
        onOpenChange={handleDialogOpenChange}
        title={editState.code ? "Edit Tax Code" : "Add Tax Code"}
        resolver={zodResolver(taxCodeSchema)}
        defaultValues={buildDefaultValues(editState.code)}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel={editState.code ? "Save Changes" : "Create"}
        resetOnOpen
      >
        {(form) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. GST18"
                  {...form.register("code")}
                />
                {form.formState.errors.code && (
                  <p className="text-xs text-destructive">{form.formState.errors.code.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rate">Rate (%)</Label>
                <Input
                  id="rate"
                  placeholder="e.g. 18 or 5.50"
                  {...form.register("rate")}
                />
                {form.formState.errors.rate && (
                  <p className="text-xs text-destructive">{form.formState.errors.rate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. GST 18%"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tax Type</Label>
              <Controller
                control={form.control}
                name="taxType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <Controller
                control={form.control}
                name="isReverseCharge"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      id="isReverseCharge"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm">Reverse Charge</span>
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      id="isActive"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                )}
              />
            </div>
          </>
        )}
      </EntityFormDialog>
    </PageWrapper>
  );
}
