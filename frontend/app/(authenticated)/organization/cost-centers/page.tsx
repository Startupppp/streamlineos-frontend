"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DollarSign, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useOrgCostCenters,
  useCreateOrgCostCenter,
  useUpdateOrgCostCenter,
  useDeleteOrgCostCenter,
} from "@/lib/api/hooks/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrgCostCenter } from "@/types/org-hierarchy";

const formSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9]+$/, "Only alphanumeric characters"),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

function CostCenterForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: FormValues;
  onSubmit: (v: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? { code: "", name: "", description: "" },
  });

  return (
    <Form {...form}>
      <form id="cc-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="CC001"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Engineering" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Optional description…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SheetFooter>
          <Button type="submit" form="cc-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </form>
    </Form>
  );
}

export default function OrgCostCentersPage() {
  const { data: costCenters, isLoading } = useOrgCostCenters();
  const create = useCreateOrgCostCenter();
  const update = useUpdateOrgCostCenter();
  const remove = useDeleteOrgCostCenter();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<OrgCostCenter | null>(null);
  const [deleting, setDeleting] = useState<OrgCostCenter | null>(null);

  const active = (costCenters ?? []).filter((c) => c.status !== "ARCHIVED");

  function handleCreate(values: FormValues) {
    create.mutate(
      { code: values.code.toUpperCase(), name: values.name, description: values.description || undefined },
      {
        onSuccess: () => {
          toast.success("Cost center created");
          setShowCreate(false);
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  function handleUpdate(values: FormValues) {
    if (!editing) return;
    update.mutate(
      { id: editing.id, code: values.code.toUpperCase(), name: values.name, description: values.description || undefined },
      {
        onSuccess: () => {
          toast.success("Cost center updated");
          setEditing(null);
        },
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  function handleDelete() {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Cost center deleted");
        setDeleting(null);
      },
      onError: (err) => toast.error(getApiError(err)),
    });
  }

  return (
    <PageWrapper
      title="Cost Centers"
      subtitle="Financial cost centers for expense tracking and reporting."
      actions={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Cost Center
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 gap-3 text-muted-foreground">
          <DollarSign className="h-10 w-10 opacity-30" />
          <p className="text-sm">No cost centers yet</p>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Cost Center
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.code}</code>
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={c.status === "ACTIVE" ? "outline" : "secondary"}
                    className={
                      c.status === "ACTIVE"
                        ? "text-green-700 border-green-200 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                        : ""
                    }
                  >
                    {c.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {c.description ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Cost Center</SheetTitle>
          </SheetHeader>
          <CostCenterForm onSubmit={handleCreate} isPending={create.isPending} />
        </SheetContent>
      </Sheet>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Cost Center</SheetTitle>
          </SheetHeader>
          {editing && (
            <CostCenterForm
              defaultValues={{
                code: editing.code,
                name: editing.name,
                description: editing.description ?? "",
              }}
              onSubmit={handleUpdate}
              isPending={update.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete Cost Center"
        description={`Are you sure you want to delete "${deleting?.name}"?`}
        onConfirm={handleDelete}
        isPending={remove.isPending}
        destructive
      />
    </PageWrapper>
  );
}
