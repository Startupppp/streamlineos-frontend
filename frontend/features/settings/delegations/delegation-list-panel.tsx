"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { DataTablePagination } from "@/components/shared/data-table-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { DELEGATION_PAGE_SIZE_OPTIONS } from "./delegation-list-state";
import { DelegationSkeletons, DelegationRow } from "./delegation-row";
import type { Delegation } from "./delegation-schema";

export interface DelegationListPanelProps {
  isLoading: boolean;
  isError: boolean;
  queryError: unknown;
  delegations: Delegation[];
  memberMap: Map<string, string>;
  listState: { search: string; page: number; limit: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
  nameField: "delegatorId" | "delegateeId";
  errorTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: { label: string; onClick: () => void };
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  revokeTarget?: Delegation | null;
  revokePending?: boolean;
  onRevoke?: (delegation: Delegation) => void;
}

export function DelegationListPanel({
  isLoading,
  isError,
  queryError,
  delegations,
  memberMap,
  listState,
  pagination,
  nameField,
  errorTitle,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRetry,
  onPageChange,
  onLimitChange,
  revokeTarget,
  revokePending,
  onRevoke,
}: DelegationListPanelProps) {
  if (isLoading)
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <DelegationSkeletons count={Math.min(listState.limit, 5)} />
      </div>
    );

  if (isError)
    return (
      <ErrorState
        compact
        title={errorTitle}
        description={getErrorMessage(queryError)}
        onRetry={onRetry}
        className={PAGE_BODY_EMPTY_CLASS}
      />
    );

  if (delegations.length === 0)
    return (
      <EmptyState
        illustrationPreset="permissions"
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={PAGE_BODY_EMPTY_CLASS}
      />
    );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-full min-h-0 overflow-y-auto scrollbar-hide divide-y divide-border/60">
          {delegations.map((delegation) => (
            <DelegationRow
              key={delegation.id}
              delegation={delegation}
              memberMap={memberMap}
              nameField={nameField}
              canRevoke={
                !!onRevoke &&
                (delegation.lifecycle === "ACTIVE" ||
                  delegation.lifecycle === "SCHEDULED")
              }
              onRevoke={onRevoke}
              isRevoking={revokePending && revokeTarget?.id === delegation.id}
            />
          ))}
        </div>
      </div>
      <div className="mt-auto shrink-0">
        <DataTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          pageSizeOptions={DELEGATION_PAGE_SIZE_OPTIONS}
        />
      </div>
    </div>
  );
}
