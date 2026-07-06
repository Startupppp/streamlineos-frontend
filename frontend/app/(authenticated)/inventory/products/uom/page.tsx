"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { EmptyProductsIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useUom, useCreateUom } from "@/hooks/api/inventory";

const uomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or less"),
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
    try {
      await createMutation.mutateAsync({
        name: values.name,
        abbreviation: values.abbreviation,
        category: values.category || undefined,
        isBase: values.isBase,
        ratioToBase: values.ratioToBase || undefined,
        roundingPrecision: Number(values.roundingPrecision),
      });
      toast.success(`Unit "${values.name}" created`);
      form.reset();
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create UOM";
      toast.error(message);
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
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {createMutation.isPending ? "Creating…" : "Add UOM"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function UomPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formKey, setFormKey] = useState<number>(0);

  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status") ?? "all";

  const query = useUom();
  const uomList = query.data ?? [];

  const filteredUom = uomList.filter((uom) => {
    const matchesSearch =
      !search ||
      uom.name.toLowerCase().includes(search.toLowerCase()) ||
      uom.abbreviation.toLowerCase().includes(search.toLowerCase());
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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    updateParams({ search: e.target.value || null });
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

  const hasFilters = !!(search || (statusParam && statusParam !== "all"));

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

        {query.isLoading ? (
          <LoadingState variant="table" rows={5} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load units"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : filteredUom.length === 0 ? (
          <EmptyState
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
        ) : (
          <div className="rounded-md border border-border overflow-x-auto">
            <Table className="min-w-[480px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80">
                    Name
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[120px]">
                    Abbreviation
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[120px]">
                    Category
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[100px] text-right">
                    Ratio
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[70px] text-center">
                    Base?
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUom.map((uom) => (
                  <TableRow key={uom.id} className="h-8 hover:bg-muted/30 transition-colors">
                    <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground">
                      {uom.name}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                      {uom.abbreviation}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
                      {uom.category ?? "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums text-muted-foreground">
                      {uom.ratioToBase ? `${uom.ratioToBase}:1` : "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-center">
                      {uom.isBase ? (
                        <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50">
                          Yes
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
