"use client";

import type { ReactNode } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import type { PermissionKey } from "@/lib/rbac/permissions";

interface ReportShellProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  filters?: ReactNode;
  actions?: ReactNode;
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
  permission,
  isLoading,
  isError,
  error,
  onRetry,
  skeletonColumns = 4,
  fill = false,
  children,
}: ReportShellProps) {
  const pageState = usePageState({ permission, isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper title={title} backHref={backHref} backLabel="Back to accounting">
        <PageState resolution={pageState} loading={null} onRetry={onRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      backLabel="Back to accounting"
      filters={filters}
      actions={actions}
      className={fill ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : undefined}
      noInternalScroll={fill}
    >
      {isLoading ? (
        <DataTableSkeleton rows={10} columns={skeletonColumns} />
      ) : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">{children}</div>
      )}
    </PageWrapper>
  );
}
