"use client";

import { useState } from "react";
import { Plus, Ruler } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useUom, useCreateUom } from "@/lib/api/hooks/inventory";

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
            <Plus className="mr-1 h-4 w-4" />
            {createMutation.isPending ? "Creating…" : "Add UOM"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function UomPage() {
  const [formKey, setFormKey] = useState<number>(0);
  const query = useUom();
  const uomList = query.data ?? [];

  function handleFormSuccess(): void {
    setFormKey((k) => k + 1);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title="Units of Measure"
      subtitle="Define units used across product catalogues and transactions."
      badge={uomList.length > 0 ? `${uomList.length}` : undefined}
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
        ) : uomList.length === 0 ? (
          <EmptyState
            illustration={
              <Ruler className="h-12 w-12 text-muted-foreground/40" />
            }
            title="No units of measure yet"
            description="Use the form above to add your first unit."
          />
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[360px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[160px]">Abbreviation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uomList.map((uom) => (
                  <TableRow key={uom.id}>
                    <TableCell className="text-sm font-medium text-foreground">
                      {uom.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
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
