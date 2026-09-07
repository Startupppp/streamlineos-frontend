"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useProjectClientGrants, useRevokeGrant } from "@/hooks/api/portal-access/grants";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import { GrantFormDialog } from "./grant-form-dialog";
import type { ProjectClientGrant, PortalGrantStatus } from "@/types/portal-access/grants";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const GRANT_STATUS_LABELS: Record<PortalGrantStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};

const GRANT_STATUS_TONES: Record<PortalGrantStatus, BadgeTone> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
  REVOKED: "danger",
  EXPIRED: "neutral",
};

const VISIBILITY_FLAGS = [
  { key: "canViewMilestones", label: "Milestones" },
  { key: "canViewTasks", label: "Tasks" },
  { key: "canViewAttachments", label: "Attachments" },
  { key: "canViewComments", label: "Comments" },
  { key: "canSubmitChangeRequests", label: "Change Requests" },
] as const satisfies ReadonlyArray<{ key: keyof ProjectClientGrant; label: string }>;

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function resolveContactName(
  firstName: string | null,
  lastName: string | null,
): string | null {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function GrantAccessButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} /> Grant Access
    </Button>
  );
}

function GrantRowActions({
  grant,
  canManage,
  onEdit,
  onRevoke,
}: {
  grant: ProjectClientGrant;
  canManage: boolean;
  onEdit: (g: ProjectClientGrant) => void;
  onRevoke: (g: ProjectClientGrant) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleEdit = useCallback(() => onEdit(grant), [grant, onEdit]);
  const handleRevoke = useCallback(() => onRevoke(grant), [grant, onRevoke]);

  if (!canManage) return null;

  const isRevocable =
    grant.status === "ACTIVE" || grant.status === "SUSPENDED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          aria-label="Grant actions"
          {...hoverHandlers}
        >
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleEdit}>
          Edit visibility
        </DropdownMenuItem>
        {isRevocable && (
          <DropdownMenuItem variant="destructive" onClick={handleRevoke}>
            Revoke
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RevokeGrantAction({
  grant,
  onSuccess,
  onSettled,
}: {
  grant: ProjectClientGrant;
  onSuccess: () => void;
  onSettled: () => void;
}) {
  const revokeGrant = useRevokeGrant(grant.projectClientGrantId);

  const handleConfirm = useCallback(() => {
    revokeGrant.mutate(undefined, {
      onSuccess: () => {
        toast.success("Access revoked");
        onSuccess();
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
        onSettled();
      },
      onSettled,
    });
  }, [revokeGrant, onSuccess, onSettled]);

  return (
    <AlertDialogAction
      variant="destructive"
      onClick={handleConfirm}
    >
      Revoke
    </AlertDialogAction>
  );
}

export function ClientAccessPage() {
  const canManage = useCan("build:clientvisibility:manage");

  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [search, setSearch] = useState("");

  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ProjectClientGrant | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ProjectClientGrant | null>(null);

  const { data, isLoading, isError, refetch } = useProjectClientGrants({
    cursor: cursorHistory.at(-1),
    limit: PAGE_SIZE,
  });

  const filteredRows = (() => {
    const rows = data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((g) => {
      const contactName = resolveContactName(g.contactFirstName, g.contactLastName) ?? "";
      return (
        contactName.toLowerCase().includes(term) ||
        g.partyContactId.toLowerCase().includes(term) ||
        String(g.projectId).includes(term) ||
        g.portalMembershipId.toLowerCase().includes(term)
      );
    });
  })();

  const pagination = data?.pagination;
  const isFiltered = !!search.trim();

  function handleSearchChange(value: string) {
    setSearch(value);
    setCursorHistory([undefined]);
  }

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.slice(0, -1));
  }, []);

  const handleOpenCreate = useCallback(() => {
    openCreate();
  }, [openCreate]);

  function handleCreateDialogChange(open: boolean) {
    if (!open) setCreateOpen(false);
  }

  function handleEditDialogChange(open: boolean) {
    if (!open) setEditTarget(null);
  }

  function handleRevokeDialogChange(open: boolean) {
    if (!open) setRevokeTarget(null);
  }

  function handleRetry() {
    void refetch();
  }

  function handleEditRow(row: ProjectClientGrant) {
    setEditTarget(row);
  }

  function handleRevokeRow(row: ProjectClientGrant) {
    setRevokeTarget(row);
  }

  function handleRevokeSuccess() {
    setRevokeTarget(null);
  }

  function handleRevokeSettled() {
    setRevokeTarget(null);
  }

  const columns: DataTableColumn<ProjectClientGrant>[] = [
    {
      key: "partyContactId",
      header: "Client contact",
      className: TABLE_TITLE_CELL,
      cell: (row) => {
        const contactName = resolveContactName(row.contactFirstName, row.contactLastName);
        return (
          <div className="min-w-0 flex flex-col gap-0.5">
            {contactName !== null ? (
              <span className={cn("text-sm font-medium text-foreground", TEXT_ONE_LINE)}>
                {contactName}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Unknown contact
              </span>
            )}
            <span
              className={cn("font-mono text-micro text-muted-foreground", TEXT_ONE_LINE)}
              title={row.partyContactId}
            >
              {truncateId(row.partyContactId)}
            </span>
          </div>
        );
      },
    },
    {
      key: "projectId",
      header: "Project",
      className: "w-24 shrink-0",
      cell: (row) => (
        <span className="text-sm text-muted-foreground tabular-nums">
          #{row.projectId}
        </span>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      className: "min-w-[220px]",
      cell: (row) => {
        const activeFlags = VISIBILITY_FLAGS.filter(
          (f) => row[f.key] === true,
        );
        if (activeFlags.length === 0) {
          return (
            <span className="text-xs text-muted-foreground">No access</span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {activeFlags.map((f) => (
              <SemanticBadge
                key={f.key}
                tone="accent"
                label={f.label}
                size="xs"
              />
            ))}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      className: "w-28 shrink-0",
      cell: (row) => (
        <SemanticBadge
          tone={GRANT_STATUS_TONES[row.status]}
          label={GRANT_STATUS_LABELS[row.status]}
          size="xs"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => (
        <GrantRowActions
          grant={row}
          canManage={canManage}
          onEdit={handleEditRow}
          onRevoke={handleRevokeRow}
        />
      ),
    },
  ];

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search by contact or project…"
        value={search}
        onValueChange={handleSearchChange}
      />
    </div>
  );

  return (
    <PageWrapper
      title="Client Access"
      subtitle="Grant clients visibility into project progress"
      filters={filtersBar}
      actions={
        canManage ? (
          <GrantAccessButton onClick={handleOpenCreate} />
        ) : undefined
      }
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={5} className="flex-1" />
          ) : isError ? (
            <ErrorState className={CONTENT_FILL_PANEL} onRetry={handleRetry} />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="clients"
              title={isFiltered ? "No matching grants" : "No client access grants"}
              description={
                isFiltered
                  ? "Try adjusting your search."
                  : "Grant clients read-only visibility into project milestones, tasks, and more."
              }
              action={
                isFiltered
                  ? undefined
                  : canManage
                    ? { label: "Grant Access", onClick: handleOpenCreate }
                    : undefined
              }
            />
          ) : (
            <>
              <DataTable
                data={filteredRows}
                columns={columns}
                getRowKey={(row) => row.projectClientGrantId}
                minWidth="680px"
                className={CONTENT_FILL_PANEL}
              />
              {pagination && (cursorHistory.length > 1 || pagination.hasMore) ? (
                <CursorPageControls
                  page={cursorHistory.length}
                  hasNext={pagination.hasMore}
                  disabled={isLoading}
                  onPrevious={handlePreviousPage}
                  onNext={() => {
                    if (pagination.nextCursor) setCursorHistory((history) => [...history, pagination.nextCursor!]);
                  }}
                  className="mt-2 px-1"
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {createOpen && (
        <GrantFormDialog
          open={createOpen}
          onOpenChange={handleCreateDialogChange}
          mode="create"
        />
      )}

      {editTarget && (
        <GrantFormDialog
          open={!!editTarget}
          onOpenChange={handleEditDialogChange}
          mode="edit"
          defaultValues={editTarget}
        />
      )}

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={handleRevokeDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke client access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the client&apos;s visibility into project{" "}
              {revokeTarget ? `#${revokeTarget.projectId}` : "this project"}.
              The client will no longer be able to see any project data. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {revokeTarget && (
              <RevokeGrantAction
                grant={revokeTarget}
                onSuccess={handleRevokeSuccess}
                onSettled={handleRevokeSettled}
              />
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
