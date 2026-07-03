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
});

type UomFormValues = z.infer<typeof uomSchema>;

function CreateUomForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateUom();

  const form = useForm<UomFormValues>({
    resolver: zodResolver(uomSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
    },
  });

  async function onSubmit(values: UomFormValues): Promise<void> {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        abbreviation: values.abbreviation,
      });
      toast.success(`Unit "${values.name}" created`);
      form.reset();
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create UOM";
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
                  <Input
                    placeholder="e.g. kg"
                    className="font-mono uppercase"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
            <CardTitle className="text-sm font-semibold">
              Add Unit of Measure
            </CardTitle>
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
              <Ruler className="h-8 w-8 text-muted-foreground/40" />
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
            <Table className="min-w-[360px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80">
                    Name
                  </TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[160px]">
                    Abbreviation
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUom.map((uom) => (
                  <TableRow
                    key={uom.id}
                    className="h-8 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground">
                      {uom.name}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground">
                      {uom.abbreviation}
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
