"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { Database, Plus } from "lucide-react";
import { useCan } from "@/hooks/api/access";
import {
  useRetentionPolicies,
  useCreateRetentionPolicy,
  useDeleteRetentionPolicy,
  type RetentionPolicy,
} from "../hooks/use-retention";

const policySchema = z.object({
  recordType: z.enum(["employee", "document", "case", "attendance", "payroll"]),
  retentionMonths: z.number().int().min(1),
  action: z.enum(["delete", "anonymize"]),
  countryCode: z.string().length(2).or(z.literal("")),
});

type PolicyForm = z.infer<typeof policySchema>;

export function RetentionPoliciesTab() {
  const canManage = useCan("hr:retention:manage");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useRetentionPolicies({ page, limit: 20 });
  const createPolicy = useCreateRetentionPolicy();
  const deletePolicy = useDeleteRetentionPolicy();

  const form = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
    defaultValues: { recordType: "employee", retentionMonths: 84, action: "anonymize", countryCode: "" },
  });

  function handleCreate(values: PolicyForm) {
    createPolicy.mutate(
      { ...values, countryCode: values.countryCode || undefined },
      { onSuccess: () => { form.reset(); setSheetOpen(false); } },
    );
  }

  function handleDelete(id: number) {
    deletePolicy.mutate(id);
  }

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  const columns: DataTableColumn<RetentionPolicy>[] = [
    {
      key: "recordType",
      header: "Record Type",
      cell: (row) => <Badge variant="outline">{row.recordType}</Badge>,
    },
    {
      key: "retentionMonths",
      header: "Retention",
      cell: (row) => <span className="text-sm">{row.retentionMonths} months</span>,
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => (
        <Badge variant={row.action === "delete" ? "destructive" : "secondary"}>
          {row.action}
        </Badge>
      ),
    },
    {
      key: "countryCode",
      header: "Country",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.countryCode ?? "Global"}</span>,
    },
    {
      key: "active",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canManage ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => handleDelete(row.id)}
            disabled={deletePolicy.isPending}
          >
            Delete
          </Button>
        ) : null,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} policies</p>
        {canManage && (
          <Button onClick={handleOpenSheet} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Policy
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center py-12">
            <Database className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No retention policies configured.</p>
          </div>
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <SheetTitle>Add Retention Policy</SheetTitle>
            <SheetDescription>Define how long a record type is retained and what happens at expiry.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="flex min-h-0 flex-1 flex-col">
              <SheetBody className="space-y-4 px-6 py-5">
              <FormField
                control={form.control}
                name="recordType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["employee", "document", "case", "attendance", "payroll"].map((t) => (
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
                name="retentionMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retention (months)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action at Expiry</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="anonymize">Anonymize</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Code (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="IN, US, GB …" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </SheetBody>
              <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                  <LoadingButton type="submit" isPending={createPolicy.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Create
                  </LoadingButton>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
}
