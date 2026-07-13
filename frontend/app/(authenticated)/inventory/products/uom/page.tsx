"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Plus, Search } from "lucide-react";
import { EmptyProductsIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useUom, useCreateUom } from "@/hooks/api/inventory";
import type { InventoryUom } from "@/types/inventory";

const uomSchema = z.object({
  name: z
    .string()
    .min(1, "Unit name is required.")
    .max(100, "Name must be 100 characters or fewer.")
    .refine((v) => v.trim().length > 0, "Unit name is required."),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required.")
    .max(20, "Abbreviation must be 20 characters or fewer.")
    .refine((v) => v.trim().length > 0, "Abbreviation is required."),
  category: z.string().optional(),
  isBase: z.boolean(),
  ratioToBase: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) > 0),
      "Must be a positive number",
    ),
  roundingPrecision: z.string().refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 6;
  }, "Must be a whole number between 0 and 6"),
});

type UomFormValues = z.infer<typeof uomSchema>;

function CreateUomForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateUom();

  const form = useForm<UomFormValues>({
    resolver: zodResolver(uomSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      category: "",
      isBase: false,
      ratioToBase: "",
      roundingPrecision: "2",
    },
  });

  const isBase = form.watch("isBase");

  async function onSubmit(values: UomFormValues): Promise<void> {
    const trimmedName = values.name.trim();
    const trimmedAbbr = values.abbreviation.trim();
    try {
      await createMutation.mutateAsync({
        name: trimmedName,
        abbreviation: trimmedAbbr,
        category: values.category?.trim() || undefined,
        isBase: values.isBase,
        ratioToBase: values.ratioToBase || undefined,
        roundingPrecision: Number(values.roundingPrecision),
      });
      toast.success(`Unit "${trimmedName}" created`);
      form.reset();
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Kilogram" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Abbreviation</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. kg" className="font-mono uppercase" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Weight, Volume, Length" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="roundingPrecision"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rounding Precision</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="6" step="1" placeholder="2" className="tabular-nums" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isBase"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-md border p-3">
                <FormLabel className="cursor-pointer">Base Unit</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          {!isBase && (
            <FormField
              control={form.control}
              name="ratioToBase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ratio to Base</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" min="0" placeholder="e.g. 1000" className="tabular-nums" {...field} />
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground mt-1">Ratio to base unit: {field.value || "—"}:1</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {isBase && (
            <p className="text-[10px] text-muted-foreground self-center">This UOM is the base unit for its category.</p>
          )}
        </div>
        <div className="flex justify-end">
          <LoadingButton type="submit" size="sm" isPending={createMutation.isPending} loadingText="Creating…">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add UOM
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

const uomColumns: DataTableColumn<InventoryUom>[] = [
  {
    key: "name",
    header: "Name",
    cell: (uom) => <span className="font-medium text-foreground">{uom.name}</span>,
  },
  {
    key: "abbreviation",
    header: "Abbreviation",
    headerClassName: "w-[120px]",
    cell: (uom) => (
      <span className="font-mono tabular-nums text-muted-foreground">{uom.abbreviation}</span>
    ),
  },
  {
    key: "category",
    header: "Category",
    headerClassName: "w-[120px]",
    cell: (uom) => <span className="text-muted-foreground">{uom.category ?? "—"}</span>,
  },
  {
    key: "ratioToBase",
    header: "Ratio",
    headerClassName: "w-[100px] text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (uom) => uom.ratioToBase ? `${uom.ratioToBase}:1` : "—",
  },
  {
    key: "isBase",
    header: "Base?",
    headerClassName: "w-[70px] text-center",
    className: "text-center",
    cell: (uom) =>
      uom.isBase ? (
        <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
          Yes
        </Badge>
      ) : (
        <span className="text-[10px] text-muted-foreground">—</span>
      ),
  },
];

function UomPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formKey, setFormKey] = useState<number>(0);

  const statusParam = searchParams.get("status") ?? "all";
  const [search, setSearch] = useState<string>(searchParams.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useUom();
  const uomList = query.data ?? [];

  const filteredUom = uomList.filter((uom) => {
    const term = debouncedSearch.trim().toLowerCase();
    const matchesSearch =
      !term ||
      uom.name.toLowerCase().includes(term) ||
      uom.abbreviation.toLowerCase().includes(term);
    const matchesStatus =
      statusParam === "all" ||
      (statusParam === "active" && uom.isActive) ||
      (statusParam === "inactive" && !uom.isActive);
    return matchesSearch && matchesStatus;
  });

  function updateParams(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("search") ?? null;
    if (trimmed !== current) {
      updateParams({ search: trimmed });
    }
  }, [debouncedSearch]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value });
  }

  function handleFormSuccess(): void {
    setFormKey((k) => k + 1);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const hasFilters = !!(search.trim() || (statusParam && statusParam !== "all"));

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <div className="relative min-w-0 flex-1 lg:max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search units..."
          className="h-8 w-full min-w-0 pl-8 text-xs"
        />
      </div>
      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <Select value={statusParam} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title="Units of Measure"
      subtitle={
        uomList.length > 0
          ? `${uomList.length} ${uomList.length === 1 ? "unit" : "units"}`
          : "Define units used across product catalogues and transactions."
      }
      filters={filtersRow}
    >
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Add Unit of Measure</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUomForm key={formKey} onSuccess={handleFormSuccess} />
          </CardContent>
        </Card>

        {query.error ? (
          <ErrorState
            title="Failed to load units"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : (
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
            <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
              <DataTable
                data={filteredUom}
                getRowKey={(uom) => uom.id}
                isLoading={query.isLoading}
                emptyState={
                  <InventoryEmptyState
                    illustration={
                      hasFilters ? <EmptySearchIllustration /> : <EmptyProductsIllustration />
                    }
                    title={hasFilters ? "No units found" : "No units of measure yet"}
                    description={
                      hasFilters
                        ? "Try adjusting your search or filters."
                        : "Use the form above to add your first unit."
                    }
                    className="border-0 bg-transparent min-h-[20vh]"
                  />
                }
                columns={uomColumns}
                minWidth="480px"
              />
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

export default function UomPage() {
  return (
    <Suspense>
      <UomPageInner />
    </Suspense>
  );
}
