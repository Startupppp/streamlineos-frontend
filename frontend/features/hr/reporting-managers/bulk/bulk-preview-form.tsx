"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateReportingLineBulkJob } from "@/hooks/api/hr/reporting-line-bulk-jobs";
import type {
  BulkJob,
  BulkReassignmentRowInput,
  CreateBulkJobInput,
} from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";
import { bulkPreviewSchema, type BulkPreviewValues } from "./bulk-reporting-change-schema";

export type BulkSource =
  | { kind: "selection"; employeeUserIds: string[]; primaryManagerUserId: string }
  | { kind: "rows"; rows: BulkReassignmentRowInput[] };

export function buildCreateInput(source: BulkSource, values: BulkPreviewValues): CreateBulkJobInput {
  const jobReason = values.jobReason.trim();
  // Q9: an omitted date is the organisation-local "today" on the server, never the browser's.
  const effectiveFrom = values.effectiveFrom ? { effectiveFrom: values.effectiveFrom } : {};
  return source.kind === "selection"
    ? { jobReason, ...effectiveFrom, employeeUserIds: source.employeeUserIds, primaryManagerUserId: source.primaryManagerUserId }
    : { jobReason, ...effectiveFrom, rows: source.rows };
}

interface BulkPreviewFormProps {
  /** Null until the source step has something to preview. */
  source: BulkSource | null;
  onPreviewed: (job: BulkJob) => void;
}

/** Step 2: a job-level reason (always required) and an optional date, then a server preview that writes nothing. */
export function BulkPreviewForm({ source, onPreviewed }: BulkPreviewFormProps) {
  const createJob = useCreateReportingLineBulkJob();
  const form = useForm<BulkPreviewValues>({
    resolver: zodResolver(bulkPreviewSchema),
    defaultValues: { jobReason: "", effectiveFrom: "" },
  });

  function handleValid(values: BulkPreviewValues) {
    if (!source) return;
    createJob.mutate(buildCreateInput(source, values), {
      onSuccess: onPreviewed,
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid)} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="jobReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for this change</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="e.g. Engineering reorganisation into platform and product teams" {...field} />
              </FormControl>
              <FormDescription>Recorded on every employee&apos;s audit trail.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="effectiveFrom"
          render={({ field }) => (
            <FormItem className="sm:max-w-xs">
              <FormLabel>Effective from</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>Leave blank for today in your organisation.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap items-center gap-3">
          <LoadingButton type="submit" isPending={createJob.isPending} disabled={!source}>
            Preview changes
          </LoadingButton>
          {!source ? <p className="text-sm text-muted-foreground">Choose employees and a manager, or upload a file, first.</p> : null}
        </div>
      </form>
    </Form>
  );
}
