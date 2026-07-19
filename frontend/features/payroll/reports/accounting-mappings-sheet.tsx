"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Trash2Icon, SettingsIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { EmptyState } from "@/components/ui/empty-state";
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
import {
  useAccountingMappings,
  useCreateAccountingMapping,
  useUpdateAccountingMapping,
  useDeleteAccountingMapping,
} from "@/hooks/api/payroll/accounting-mappings";
import { usePayrollComponents } from "@/hooks/api/payroll/components";
import { useCan } from "@/hooks/api/access";
import type { AccountingMapping } from "@/types/payroll/reports";

interface AccountingMappingsSheetProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

const mappingSchema = z.object({
  componentId: z.string().optional(),
  category: z.string().optional(),
  ledgerName: z.string().min(1, "Ledger name is required"),
  costCenterSource: z.string().optional(),
  notes: z.string().optional(),
});

type MappingFormValues = z.infer<typeof mappingSchema>;

function MappingForm({
  editing,
  onSuccess,
  onCancel,
}: {
  editing: AccountingMapping | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { data: componentsData } = usePayrollComponents({ active: true, pageSize: 100 });
  const create = useCreateAccountingMapping();
  const update = useUpdateAccountingMapping();

  const form = useForm<MappingFormValues>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      componentId: editing?.componentId != null ? String(editing.componentId) : "",
      category: editing?.category ?? "",
      ledgerName: editing?.ledgerName ?? "",
      costCenterSource: editing?.costCenterSource ?? "",
      notes: editing?.notes ?? "",
    },
  });

  function onSubmit(values: MappingFormValues) {
    const input = {
      ledgerName: values.ledgerName,
      componentId: values.componentId ? parseInt(values.componentId, 10) : undefined,
      category: values.category || undefined,
      costCenterSource: values.costCenterSource || undefined,
      notes: values.notes || undefined,
    };

    if (editing) {
      update.mutate(
        { id: editing.id, ...input },
        {
          onSuccess: () => { toast.success("Mapping updated"); onSuccess(); },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => { toast.success("Mapping created"); onSuccess(); form.reset(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  const components = componentsData?.items ?? [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="componentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Component (optional)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {components.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Category (optional)</FormLabel>
              <FormControl>
                <Input {...field} className="text-xs" placeholder="e.g. EARNINGS" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ledgerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Ledger Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input {...field} className="text-xs" placeholder="e.g. Salary Expense" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="costCenterSource"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px]">Cost Center Source (optional)</FormLabel>
              <FormControl>
                <Input {...field} className="text-xs" placeholder="e.g. department" />
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
              <FormLabel className="text-[11px]">Notes (optional)</FormLabel>
              <FormControl>
                <Input {...field} className="text-xs" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2 pt-1">
          <LoadingButton type="submit" size="sm" className="text-xs" isPending={create.isPending || update.isPending} loadingText={editing ? "Updating…" : "Adding…"}>
            {editing ? "Update" : "Add Mapping"}
          </LoadingButton>
          <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function AccountingMappingsSheet({ open: externalOpen, onOpenChange: externalOnOpenChange }: AccountingMappingsSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<AccountingMapping | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canManage = useCan("payroll:settings:manage");

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? (externalOpen ?? false) : internalOpen;

  const { data: mappings = [] } = useAccountingMappings();
  const deleteMapping = useDeleteAccountingMapping();

  function handleOpenChange(v: boolean) {
    if (isControlled) {
      externalOnOpenChange?.(v);
    } else {
      setInternalOpen(v);
    }
    if (!v) {
      setEditingMapping(null);
      setShowForm(false);
    }
  }

  function handleEdit(mapping: AccountingMapping) {
    setEditingMapping(mapping);
    setShowForm(true);
  }

  function handleDelete(id: number) {
    deleteMapping.mutate(
      { id },
      {
        onSuccess: () => toast.success("Mapping deleted"),
        onError: () => toast.error("Failed to delete mapping"),
      },
    );
  }

  function handleFormSuccess() {
    setEditingMapping(null);
    setShowForm(false);
  }

  function handleFormCancel() {
    setEditingMapping(null);
    setShowForm(false);
  }

  function handleAddNew() {
    setEditingMapping(null);
    setShowForm(true);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {!isControlled && canManage && (
        <SheetTrigger asChild>
          <AnimatedIconButton icon={SettingsIcon} iconClassName="mr-1.5" variant="outline" size="sm" className="text-xs">
            Manage Mappings
          </AnimatedIconButton>
        </SheetTrigger>
      )}
      <SheetContent className="p-0 w-full sm:max-w-md flex flex-col overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>Accounting Mappings</SheetTitle>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-3 px-6 py-4">
          {mappings.length > 0 && (
            <div className="flex flex-col gap-1">
              {mappings.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <TruncatedText text={m.ledgerName} className="text-[12px] font-medium" />
                    <p className="text-[11px] text-muted-foreground">
                      {m.category ?? (m.componentId != null ? `Component #${m.componentId}` : "—")}
                    </p>
                    {m.notes && <TruncatedText text={m.notes} className="text-[10px] text-muted-foreground" />}
                  </div>
                  {canManage && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleEdit(m)}
                        aria-label="Edit mapping"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AnimatedIconButton
                        icon={Trash2Icon}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(m.id)}
                        aria-label="Delete mapping"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!mappings.length && !showForm && (
            <EmptyState
              illustrationPreset="report"
              title="No accounting mappings"
              description="Map payroll component codes to ledger accounts for journal generation."
              action={canManage ? { label: "Add Mapping", onClick: handleAddNew } : undefined}
            />
          )}

          {canManage && !showForm && mappings.length > 0 && (
            <Button variant="outline" size="sm" className="text-xs" onClick={handleAddNew}>
              Add Mapping
            </Button>
          )}

          {showForm && (
            <div className="rounded-md border border-border p-3 bg-muted/30">
              <p className="text-[11px] font-medium text-foreground mb-3">
                {editingMapping ? "Edit Mapping" : "New Mapping"}
              </p>
              <MappingForm
                editing={editingMapping}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
