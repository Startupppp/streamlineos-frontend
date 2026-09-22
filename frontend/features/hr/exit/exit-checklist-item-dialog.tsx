"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { EntityFormDialog } from "@/components/shared";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { UserCombobox } from "@/components/ui/user-combobox";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { EXIT_CHECKLIST_QUEUES, EXIT_CHECKLIST_STATUSES } from "@/hooks/api/hr/exit-schema";
import { useUpdateExitChecklistItem, type ExitChecklistItem } from "@/hooks/api/hr/exit";
import {
  exitChecklistItemFormDefaults,
  exitChecklistItemFormSchema,
  exitChecklistItemUpdateFromForm,
  type ExitChecklistItemFormInput,
  type ExitChecklistItemFormValues,
} from "./exit-checklist-item-schema";
import { EXIT_CHECKLIST_QUEUE_LABELS, EXIT_CHECKLIST_STATUS_LABELS } from "./exit-checklist-surfaces";

interface ExitChecklistItemDialogProps {
  resignationId: number;
  item: ExitChecklistItem | null;
  canReassign: boolean;
  onClose: () => void;
}

type ItemForm = UseFormReturn<ExitChecklistItemFormInput, unknown, ExitChecklistItemFormValues>;

function ExitChecklistItemFields({ form, canReassign }: { form: ItemForm; canReassign: boolean }) {
  const owner = form.watch("owner");
  const status = form.watch("status");
  return (
    <>
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                {EXIT_CHECKLIST_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EXIT_CHECKLIST_STATUS_LABELS[value]}
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
        name="evidence"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{status === "WAIVED" ? "Why it does not apply" : "Completion evidence"}</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} placeholder="Laptop AS-19 and badge returned to IT on 30 Oct; recorded in asset returns" />
            </FormControl>
            <FormDescription>What an auditor reads to accept this item as closed.</FormDescription>
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
              <Textarea {...field} rows={2} placeholder="Anything the next owner should know" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {canReassign ? (
        <>
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="owner"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value="keep">Keep the current owner</SelectItem>
                    <SelectItem value="person">A specific person</SelectItem>
                    {EXIT_CHECKLIST_QUEUES.map((queue) => (
                      <SelectItem key={queue} value={queue}>
                        {EXIT_CHECKLIST_QUEUE_LABELS[queue]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {owner === "person" ? (
            <FormField
              control={form.control}
              name="ownerUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Person</FormLabel>
                  <FormControl>
                    <UserCombobox value={field.value} onChange={field.onChange} placeholder="Choose the owner" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}

export function ExitChecklistItemDialog({ resignationId, item, canReassign, onClose }: ExitChecklistItemDialogProps) {
  const update = useUpdateExitChecklistItem();

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: ExitChecklistItemFormValues) {
    if (!item) return;
    const input = exitChecklistItemUpdateFromForm(item, values, canReassign);
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { resignationId, itemKey: item.itemKey, input },
      {
        onSuccess: (updated) => {
          toast.success(`${updated.title} updated`);
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function renderFields(form: ItemForm) {
    return <ExitChecklistItemFields form={form} canReassign={canReassign} />;
  }

  if (!item) return null;

  return (
    <EntityFormDialog<ExitChecklistItemFormInput, ExitChecklistItemFormValues>
      open={item !== null}
      onOpenChange={handleOpenChange}
      title={item.title}
      description={canReassign ? "Close, waive, reassign or reschedule this item." : "Close or waive this item with the evidence behind it."}
      resolver={zodResolver(exitChecklistItemFormSchema)}
      defaultValues={exitChecklistItemFormDefaults(item)}
      onSubmit={handleSubmit}
      isSubmitting={update.isPending}
      submitLabel="Save item"
      resetOnOpen
    >
      {renderFields}
    </EntityFormDialog>
  );
}
