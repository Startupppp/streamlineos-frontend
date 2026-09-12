"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { UserPlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  DataTableSkeleton,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  useWarehouseAssignees,
  useRevokeWarehouseUser,
  WAREHOUSE_ASSIGNMENT_PERMISSION,
  type WarehouseAssignee,
} from "@/hooks/api/inventory/warehouses";
import { AssignWarehouseUserDialog } from "./assign-warehouse-user-dialog";

const PAGE_SIZE = 20;

interface WarehouseAccessTabProps {
  warehouseId: number;
  warehouseName: string;
}

interface RevokeButtonProps {
  assignee: WarehouseAssignee;
  onRevoke: (assignee: WarehouseAssignee) => void;
}

function RevokeButton({ assignee, onRevoke }: RevokeButtonProps) {
  const handleClick = useCallback(() => onRevoke(assignee), [assignee, onRevoke]);
  return (
    <AnimatedIconButton
      icon={Trash2Icon}
      iconSize={14}
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      aria-label={`Revoke access for ${getUserDisplayName(assignee)}`}
      onClick={handleClick}
    />
  );
}

function buildColumns(
  onRevoke: (assignee: WarehouseAssignee) => void,
): DataTableColumn<WarehouseAssignee>[] {
  return [
    {
      key: "member",
      header: "Member",
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage src={resolveImageUrl(row.image)} />
            <AvatarFallback className="text-micro">{getUserInitials(row)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-dense font-medium text-foreground">
              {getUserDisplayName(row)}
            </p>
            <p className="truncate text-micro text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "grantedBy",
      header: "Granted by",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">{row.grantedByName ?? "—"}</span>
      ),
    },
    {
      key: "grantedAt",
      header: "Granted",
      cell: (row) => (
        <span className="text-dense font-mono tabular-nums text-muted-foreground">
          {formatShortDate(row.grantedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-8",
      headerClassName: "w-8",
      cell: (row) => <RevokeButton assignee={row} onRevoke={onRevoke} />,
    },
  ];
}

export function WarehouseAccessTab({ warehouseId, warehouseName }: WarehouseAccessTabProps) {
  const canManage = useCan(WAREHOUSE_ASSIGNMENT_PERMISSION);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useWarehouseAssignees(warehouseId, {
    page,
    limit: PAGE_SIZE,
  });
  const revoke = useRevokeWarehouseUser(warehouseId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [pendingRevoke, setPendingRevoke] = useState<WarehouseAssignee | null>(null);

  const handleRevokeRequest = useCallback((assignee: WarehouseAssignee) => {
    setPendingRevoke(assignee);
  }, []);

  const columns = useMemo(() => buildColumns(handleRevokeRequest), [handleRevokeRequest]);

  const handleOpenAssign = useCallback(() => setAssignOpen(true), []);

  const handlePageChange = useCallback((nextPage: number) => setPage(nextPage), []);

  const handleRevokeDialogChange = useCallback((open: boolean) => {
    if (!open) setPendingRevoke(null);
  }, []);

  const handleConfirmRevoke = useCallback(() => {
    if (!pendingRevoke) return;
    const name = getUserDisplayName(pendingRevoke);
    revoke.mutate(
      { userId: pendingRevoke.userId },
      {
        onSuccess: () => {
          toast.success(`Revoked ${name}'s access to ${warehouseName}`);
          setPendingRevoke(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [pendingRevoke, revoke, warehouseName]);

  function handleRetry(): void {
    void refetch();
  }

  if (!canManage) {
    return (
      <NoPermissionState
        permission={WAREHOUSE_ASSIGNMENT_PERMISSION}
        title="Warehouse access is restricted"
        description="Viewing or changing who may transact in this warehouse needs warehouse management permission."
        className="flex-1"
      />
    );
  }

  const assignees = data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-dense text-muted-foreground">
          These members may see and transact in {warehouseName}. Anyone holding org-wide
          warehouse scope has access without being listed here.
        </p>
        <AnimatedIconButton
          icon={UserPlusIcon}
          iconSize={14}
          iconClassName="mr-1"
          size="sm"
          className="text-xs"
          onClick={handleOpenAssign}
        >
          Assign member
        </AnimatedIconButton>
      </div>

      {isLoading ? (
        <DataTableSkeleton rows={6} columns={4} />
      ) : isError ? (
        <ErrorState
          title="Failed to load warehouse access"
          description="An error occurred while fetching the assignment list. Please try again."
          onRetry={handleRetry}
          compact
        />
      ) : (
        <DataTable
          data={assignees}
          columns={columns}
          className="flex-1 min-h-0"
          getRowKey={(row) => row.userId}
          emptyState={
            <InventoryEmptyState
              title="No one is assigned"
              description="Operators without org-wide warehouse scope see no stock here until they are assigned."
              action={{ label: "Assign member", onClick: handleOpenAssign }}
              compact
            />
          }
          pagination={{
            mode: "server",
            page,
            pageSize: PAGE_SIZE,
            total: data?.total ?? 0,
            onPageChange: handlePageChange,
          }}
        />
      )}

      <AssignWarehouseUserDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        warehouseId={warehouseId}
        warehouseName={warehouseName}
      />

      {pendingRevoke ? (
        <ConfirmDialog
          open
          onOpenChange={handleRevokeDialogChange}
          title="Revoke warehouse access"
          description={`${getUserDisplayName(pendingRevoke)} will no longer see or transact in ${warehouseName}.`}
          confirmLabel="Revoke access"
          destructive
          isPending={revoke.isPending}
          onConfirm={handleConfirmRevoke}
        />
      ) : null}
    </div>
  );
}
