"use client";

import { AppDialog } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReportExplain } from "@/hooks/api/crm/reporting";
import type { ReportingQueryDescription } from "@/types/crm/reporting";

interface ReportExplainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Null until the builder has a description worth compiling. */
  description: ReportingQueryDescription | null;
}

/**
 * What the database would be asked, without asking it.
 *
 * The module's own docblock says this endpoint "exists to be used by people who
 * do not believe the docblocks" — send the most hostile description you can
 * express and read back the statement. Until now nothing called it, so the
 * claim was unfalsifiable from the product: the one screen that could have
 * shown a reviewer their values are absent from the SQL did not offer to.
 *
 * The parameter count is shown and the parameters are not, because the server
 * refuses to return them. That refusal is the point and is stated rather than
 * left to look like an omission.
 */
export function ReportExplainDialog({
  open,
  onOpenChange,
  description,
}: ReportExplainDialogProps) {
  const explain = useReportExplain(open ? description : null);

  function handleRetry() {
    void explain.refetch();
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="What this report runs"
      description="The compiled statement, with placeholders where your values go."
      className="sm:max-w-2xl"
    >
      {explain.access.denied ? (
        <NoPermissionState permission="crm:reporting:manage" compact />
      ) : explain.isError ? (
        <ErrorState
          title="Couldn't compile this report"
          description={getErrorMessage(explain.error)}
          onRetry={handleRetry}
        />
      ) : explain.isLoading || !explain.data ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-40 w-full rounded-md" />
        </div>
      ) : (
        <div className="flex flex-col gap-gap-field">
          <dl className="grid grid-cols-2 gap-gap-field">
            <div>
              <dt className="text-micro text-muted-foreground">Reads</dt>
              <dd className="text-sm font-medium">{explain.data.source}</dd>
            </div>
            <div>
              <dt className="text-micro text-muted-foreground">Values bound</dt>
              <dd className="text-sm font-medium tabular-nums">
                {explain.data.parameterCount}
              </dd>
            </div>
          </dl>

          <pre className="max-h-80 overflow-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-dense whitespace-pre-wrap break-words">
            {explain.data.sql}
          </pre>

          <p className="text-label text-muted-foreground">
            Your filter values are not in this statement and are not returned by this
            endpoint — they are bound separately as the {explain.data.parameterCount} placeholders
            above.
          </p>
        </div>
      )}
    </AppDialog>
  );
}
