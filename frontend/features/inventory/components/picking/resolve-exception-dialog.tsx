"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useResolvePickException,
  type PickExceptionSummary,
} from "@/hooks/api/inventory/pick-exceptions";
import { PICK_EXCEPTION_LABEL } from "@/features/inventory/lib/inventory-status";
import {
  resolvePickExceptionSchema,
  type ResolvePickExceptionFormValues,
} from "./pick-exception-schema";

interface ResolveExceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exception: PickExceptionSummary | null;
}

/**
 * B5, item 4 — the supervisor's signature.
 *
 * A damaged or substituted line holds its wave open until somebody has looked at
 * it, and this is the act that ends the block. It moves no stock, in either
 * direction: by the time a reviewer sees the row the goods have already been
 * taken off a shelf or found broken, and the reservation arithmetic was settled
 * when the exception was raised. "Not accepted" therefore means the report is
 * disputed and somebody has to chase it, not that it can be undone from a
 * screen — so the copy says that rather than implying an undo the warehouse
 * cannot honour.
 */
export function ResolveExceptionDialog({
  open,
  onOpenChange,
  exception,
}: ResolveExceptionDialogProps) {
  const resolve = useResolvePickException();

  function handleSubmit(values: ResolvePickExceptionFormValues): void {
    if (!exception) return;
    resolve.mutate(
      {
        pickLineId: exception.pickLineId,
        pickListId: exception.pickListId,
        resolution: values.resolution,
        notes: values.notes,
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.waveComplete
              ? "Reviewed — the wave is finished"
              : "Reviewed",
          );
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<ResolvePickExceptionFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Review this exception"
      description={
        exception
          ? `${PICK_EXCEPTION_LABEL[exception.reason]} · ${exception.sku} on ${exception.pickNumber}`
          : undefined
      }
      resolver={zodResolver(resolvePickExceptionSchema)}
      defaultValues={{ resolution: "ACCEPTED", notes: "" }}
      onSubmit={handleSubmit}
      isSubmitting={resolve.isPending}
      submitLabel="Record decision"
      resetOnOpen
    >
      {(form) => (
        <div className="grid gap-4">
          {exception?.notes ? (
            <p className="text-label text-muted-foreground">
              The picker said: {exception.notes}
            </p>
          ) : null}

          <FormField
            control={form.control}
            name="resolution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Decision</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    <SelectItem value="ACCEPTED">
                      Accepted — the order goes on as reported
                    </SelectItem>
                    <SelectItem value="REJECTED">
                      Not accepted — somebody has to chase this
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Either way the wave stops waiting on this line. Nothing moves on the
                  shelf: goods already in a tote come back through a putaway or a count,
                  not from here.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What you decided, and why</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Written off and the customer told…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
