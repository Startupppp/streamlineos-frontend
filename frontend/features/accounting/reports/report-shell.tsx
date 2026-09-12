"use client";

import type { ReactNode } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface ReportShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  canView: boolean;
  permission: PermissionKey;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  skeletonColumns?: number;
  fill?: boolean;
  children: ReactNode;
}

export function ReportShell({
  title,
  subtitle,
  backHref,
  filters,
  actions,
  canView,
  permission,
  isLoading,
  isError,
  error,
  onRetry,
  skeletonColumns = 4,
  fill = false,
  children,
}: ReportShellProps) {
  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel="Back to accounting"
      filters={canView ? filters : undefined}
      actions={canView ? actions : undefined}
      className={fill ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : undefined}
      noInternalScroll={fill}
    >
      {!canView ? (
        <NoPermissionState permission={permission} />
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load this report"
          description={getErrorMessage(error)}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <DataTableSkeleton rows={10} columns={skeletonColumns} />
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">{children}</div>
      )}
    </PageWrapper>
  );
}
