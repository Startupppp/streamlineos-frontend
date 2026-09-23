"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useProjectInvoiceLineDetail,
  useUpdateProjectInvoiceLineDetail,
} from "@/hooks/api/invoices/project-invoice-line-detail";
import {
  INVOICE_LINE_DETAIL_DESCRIPTIONS,
  INVOICE_LINE_DETAIL_LABELS,
  INVOICE_LINE_DETAIL_VALUES,
  SAFE_INVOICE_LINE_DETAIL,
  type InvoiceLineDetail,
} from "@/hooks/api/invoices/project-invoice-line-detail-schema";
import {
  invoiceLineDetailFormSchema,
  type InvoiceLineDetailFormValues,
} from "./invoice-line-detail-schema";

interface InvoiceLineDetailSectionProps {
  projectId: number;
}

export function InvoiceLineDetailSection({
  projectId,
}: InvoiceLineDetailSectionProps) {
  const { data, isLoading, isError, refetch } =
    useProjectInvoiceLineDetail(projectId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isError) return <ErrorState compact onRetry={handleRetry} />;

  if (isLoading)
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    );

  return (
    <InvoiceLineDetailForm
      projectId={projectId}
      initial={data?.invoiceLineDetail ?? SAFE_INVOICE_LINE_DETAIL}
    />
  );
}

interface InvoiceLineDetailFormProps {
  projectId: number;
  initial: InvoiceLineDetail;
}

function InvoiceLineDetailForm({
  projectId,
  initial,
}: InvoiceLineDetailFormProps) {
  const canUpdate = useCan("build:update");
  const updateMutation = useUpdateProjectInvoiceLineDetail();

  const form = useForm<InvoiceLineDetailFormValues>({
    resolver: zodResolver(invoiceLineDetailFormSchema),
    defaultValues: { invoiceLineDetail: initial },
  });

  const handleSubmit = useCallback(
    (values: InvoiceLineDetailFormValues) => {
      updateMutation.mutate(
        { projectId, invoiceLineDetail: values.invoiceLineDetail },
        {
          onSuccess: () => {
            toast.success("Invoice line detail updated");
          },
          onError: (error) => {
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [updateMutation, projectId],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="invoiceLineDetail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice line detail</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!canUpdate}
              >
                <FormControl>
                  <SelectTrigger aria-label="Invoice line detail">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {INVOICE_LINE_DETAIL_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {INVOICE_LINE_DETAIL_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {INVOICE_LINE_DETAIL_DESCRIPTIONS[field.value]}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <LoadingButton
          type="submit"
          isPending={updateMutation.isPending}
          loadingText="Saving…"
          disabled={!canUpdate}
        >
          Save line detail
        </LoadingButton>
      </form>
    </Form>
  );
}
