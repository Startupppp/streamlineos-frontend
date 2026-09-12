"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useInspectCustomerReturnLine,
  type CustomerReturnLine,
} from "@/hooks/api/inventory/returns";
import {
  inspectReturnLineSchema,
  RETURN_DISPOSITIONS,
  type InspectReturnLineFormValues,
} from "./return-inspect-schema";

export interface ReturnInspectLineProps {
  returnId: number;
  line: CustomerReturnLine;
  /** The SKU behind `line.productVariantId`. A visible id is a bug (§5). */
  sku: string;
  /** False once the return leaves DRAFT — the approval signed off this verdict. */
  editable: boolean;
}

/**
 * INV-209 / B9 — one line's inspection, as its own small form.
 *
 * Per line rather than a single bulk save, because that is how the goods arrive:
 * somebody opens one box, decides, and writes it down. A bulk form would also
 * mean one failure discards eleven decisions already made.
 */
export function ReturnInspectLine({ returnId, line, sku, editable }: ReturnInspectLineProps) {
  const inspect = useInspectCustomerReturnLine();
  const inspected = line.inspectedAt !== null;
  const tone = statusToneClasses(inspected ? "success" : "warning");

  const form = useForm<InspectReturnLineFormValues>({
    resolver: zodResolver(inspectReturnLineSchema),
    defaultValues: {
      disposition: line.disposition ?? "RESTOCK",
      inspectionNotes: line.inspectionNotes ?? "",
    },
  });

  function handleSubmit(values: InspectReturnLineFormValues): void {
    inspect.mutate(
      {
        returnId,
        lineId: line.id,
        disposition: values.disposition,
        ...(values.inspectionNotes ? { inspectionNotes: values.inspectionNotes } : {}),
      },
      {
        onSuccess: () => toast.success("Inspection recorded"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <div className="rounded-md border border-border/70 bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{sku}</p>
          <p className="font-mono text-micro tabular-nums text-muted-foreground">
            {line.quantity}
          </p>
        </div>
        <span className={cn("flex shrink-0 items-center gap-1 text-micro", tone.ink)}>
          {inspected ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <CircleDashed className="h-3.5 w-3.5" aria-hidden />
          )}
          {inspected ? "Inspected" : "Awaiting inspection"}
        </span>
      </div>

      {line.notes ? (
        <p className="mt-2 text-micro text-muted-foreground">
          Customer said: {line.notes}
        </p>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-3 grid gap-2">
          <FormField
            control={form.control}
            name="disposition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disposition</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!editable}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {RETURN_DISPOSITIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex flex-col text-left">
                          <span>{option.label}</span>
                          <span className="text-micro text-muted-foreground">{option.hint}</span>
                        </span>
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
            name="inspectionNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What you saw</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Unopened, resaleable"
                    disabled={!editable}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {editable ? (
            <LoadingButton
              type="submit"
              variant="outline"
              size="sm"
              className="justify-self-end"
              isPending={inspect.isPending}
              loadingText="Recording…"
            >
              {inspected ? "Update inspection" : "Record inspection"}
            </LoadingButton>
          ) : null}
        </form>
      </Form>
    </div>
  );
}
