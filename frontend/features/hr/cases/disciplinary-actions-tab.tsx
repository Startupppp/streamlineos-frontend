"use client";

import { useCallback, useMemo } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";
import { StateIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import { useDisciplinaryActions } from "@/hooks/api/hr/cases";
import type { DisciplinaryAction } from "@/hooks/api/hr/cases";
import type { DataTableColumn } from "@/components/ui/data-table";

interface DisciplinaryActionsTabProps {
  canManage: boolean;
  onIssueAction: () => void;
}

/**
 * The second tab owns its own read, its own cursor stack and its own employee
 * name resolution — none of which the cases tab shares — so it is a module of
 * its own rather than a branch of the page.
 */
export function DisciplinaryActionsTab({ canManage, onIssueAction }: DisciplinaryActionsTabProps) {
  const pagination = useCursorPageStack();
  const { data, isLoading, isError, error, refetch } = useDisciplinaryActions({
    cursor: pagination.cursor,
  });

  const employeeIds = useMemo(
    () => [...new Set((data?.data ?? []).map((r) => r.employeeId))],
    [data?.data],
  );
  const { data: membersData } = useOrgMembersByIds(employeeIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const columns: DataTableColumn<DisciplinaryAction>[] = useMemo(
    () => [
      {
        key: "employee",
        header: "Employee",
        cell: (row) => (
          <span className="text-sm">{getUserDisplayName(memberById.get(row.employeeId))}</span>
        ),
      },
      {
        key: "actionType",
        header: "Action",
        cell: (row) => (
          <span className="text-sm capitalize">{row.actionType.replace(/_/g, " ")}</span>
        ),
      },
      {
        key: "effectiveDate",
        header: "Effective Date",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.effectiveDate).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: "issuedBy",
        header: "Issued By",
        cell: (row) => <span className="font-mono text-xs">{row.issuedBy}</span>,
      },
    ],
    [memberById],
  );

  const hasMore = data?.pagination.hasMore ?? false;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNextPage = useCallback(() => {
    pagination.goToNextPage(data?.pagination.nextCursor);
  }, [pagination, data]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      {canManage && (
        <div className="flex justify-end">
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            className="gap-1.5 text-sm"
            onClick={onIssueAction}
          >
            Issue Action
          </AnimatedIconButton>
        </div>
      )}
      {isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load disciplinary actions"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          className="flex-1 min-h-0"
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          getRowKey={(row) => row.id}
          emptyState={
            <EmptyState
              className="border-0 bg-transparent min-h-[40vh]"
              illustration={<StateIllustration preset="security" className="h-28 w-28" />}
              title="No disciplinary actions"
              description="Formal disciplinary actions issued to employees will appear here."
              action={canManage ? { label: "Issue Action", onClick: onIssueAction } : undefined}
            />
          }
        />
      )}
      {!isError && (pagination.hasPrevious || hasMore) ? (
        <CursorPageControls
          page={pagination.page}
          hasNext={hasMore}
          onPrevious={pagination.goToPreviousPage}
          onNext={handleNextPage}
        />
      ) : null}
    </div>
  );
}
