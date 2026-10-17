"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useProjectClientGrants, useRevokeGrant, useBulkRevokeGrant } from "@/hooks/api/portal-access/grants";
import { useCan } from "@/hooks/api/access";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { PM_TOOLBAR } from "@/components/pm-chrome";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import type { BadgeTone } from "@/components/ui/semantic-badge";
import { GrantFormDialog } from "./grant-form-dialog";
import { InviteClientDialog } from "./invite-client-dialog";
import type { ProjectClientGrant, PortalGrantStatus } from "@/types/portal-access/grants";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  CONTENT_FILL_PANEL,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useClientAccessUrlState } from "./use-client-access-url-state";

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
  { key: "canViewApprovals", label: "Approvals" },
  { key: "canViewInvoices", label: "Invoices" },
  { key: "canViewRequests", label: "Requests" },
] as const satisfies ReadonlyArray<{ key: keyof ProjectClientGrant; label: string }>;

const GRANT_STATE_FILTERS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
] as const;

const GRANT_PERMISSION_FILTERS = VISIBILITY_FLAGS.map(({ key, label }) => ({
  value: key,
  label,
}));

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

function RevokeGrantDialog({
  grant,
  onOpenChange,
}: {
  grant: ProjectClientGrant;
  onOpenChange: (open: boolean) => void;
}) {
  const revokeGrant = useRevokeGrant(grant.projectClientGrantId);

  function handleConfirm() {
    revokeGrant.mutate(undefined, {
      onSuccess: () => {
        toast.success("Access revoked");
        onOpenChange(false);
      },
      onError: (e) => {
        toast.error(getErrorMessage(e));
      },
    });
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Revoke client access?"
      description={`This will revoke the client's visibility into project #${grant.projectId}. The client will no longer be able to see any project data. This action cannot be undone.`}
      confirmLabel="Revoke"
      destructive
      isPending={revokeGrant.isPending}
      onConfirm={handleConfirm}
      keepOpenOnConfirm
    />
  );
}

export function ClientAccessPage() {
  const canManage = useCan("build:clientvisibility:manage");

  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [selectedGrantIds, setSelectedGrantIds] = useState<Set<string | number>>(new Set());
  const [bulkRevokeOpen, setBulkRevokeOpen] = useState(false);
  const {
    q,
    state: grantState,
    permission,
    hasActiveFilters,
    setFilter,
    resetFilters,
  } = useClientAccessUrlState();

  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const [editTarget, setEditTarget] = useState<ProjectClientGrant | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ProjectClientGrant | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useProjectClientGrants({
    cursor: cursorHistory.at(-1),
    limit: PAGE_SIZE,
    q: q || undefined,
    state: grantState || undefined,
    permission: permission || undefined,
  });

  const pageState = usePageState({
    permission: "build:portal:view",
    isLoading,
    isError,
    error,
  });

  const filteredRows = useMemo(() => data?.data ?? [], [data?.data]);
  const pagination = data?.pagination;
  const isFiltered = hasActiveFilters;

  const bulkRevoke = useBulkRevokeGrant();

  const handleKeyboardClear = useCallback(() => setSelectedGrantIds(new Set()), []);

  const handleKeyboardEdit = useCallback(
    (index: number) => {
      const row = filteredRows[index];
      if (row) setEditTarget(row);
    },
    [filteredRows],
  );

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      if (canManage) handleKeyboardEdit(index);
    },
    [canManage, handleKeyboardEdit],
  );

  const handleBulkRevokeConfirm = useCallback(() => setBulkRevokeOpen(true), []);

  const handleBulkRevoke = useCallback(() => {
    if (!canManage) return;
    setBulkRevokeOpen(false);
    selectedGrantIds.forEach((id) => {
      bulkRevoke.mutate(String(id), {
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    });
    setSelectedGrantIds(new Set());
  }, [canManage, selectedGrantIds, bulkRevoke]);

  function handleSearchChange(value: string) {
    setFilter("q", value);
    setCursorHistory([undefined]);
    setSelectedGrantIds(new Set());
  }

  function handleStateChange(value: string) {
    setFilter("state", value === "all" ? "" : value);
    setCursorHistory([undefined]);
    setSelectedGrantIds(new Set());
  }

  function handlePermissionChange(value: string) {
    setFilter("permission", value === "all" ? "" : value);
    setCursorHistory([undefined]);
    setSelectedGrantIds(new Set());
  }

  function handleResetFilters() {
    resetFilters();
    setCursorHistory([undefined]);
    setSelectedGrantIds(new Set());
  }

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.slice(0, -1));
    setSelectedGrantIds(new Set());
  }, []);

  const handleOpenCreate = useCallback(() => {
    openCreate();
  }, [openCreate]);

  const handleOpenInvite = useCallback(() => {
    setInviteOpen(true);
  }, []);

  function handleInviteOpenChange(nextOpen: boolean) {
    setInviteOpen(nextOpen);
  }

  function handlePageMembershipInvited() {
    setInviteOpen(false);
  }

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

  function handleNextPage(): void {
    const nextCursor = pagination?.nextCursor;
    if (nextCursor) {
      setCursorHistory((history) => [...history, nextCursor]);
      setSelectedGrantIds(new Set());
    }
  }

  useBuildListKeyboard({
    itemCount: filteredRows.length,
    onOpen: handleKeyboardOpen,
    onCreate: canManage ? handleOpenCreate : undefined,
    onEdit: canManage ? handleKeyboardEdit : undefined,
    onClearSelection: handleKeyboardClear,
    enabled: pageState.kind === "ready",
  });

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
        aria-label="Search client access grants"
        value={q}
        onValueChange={handleSearchChange}
      />
      <Select value={grantState || "all"} onValueChange={handleStateChange}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter by grant status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {GRANT_STATE_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={permission || "all"} onValueChange={handlePermissionChange}>
        <SelectTrigger className="w-full sm:w-48" aria-label="Filter by client permission">
          <SelectValue placeholder="All permissions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All permissions</SelectItem>
          {GRANT_PERMISSION_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters ? (
        <Button variant="ghost" size="sm" className="shrink-0" onClick={handleResetFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );

  return (
    <PageWrapper
      title="Client Access"
      subtitle={pageState.kind === "ready" ? "Grant clients visibility into project progress" : undefined}
      filters={pageState.kind === "ready" ? filtersBar : undefined}
      actions={
        pageState.kind === "ready" && canManage ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenInvite}>
              Invite Client
            </Button>
            <GrantAccessButton onClick={handleOpenCreate} />
          </div>
        ) : undefined
      }
    >
      <PageState
        resolution={pageState}
        loading={<DataTableSkeleton rows={12} columns={5} className="flex-1" />}
        onRetry={handleRetry}
        className="flex-1"
      >
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            {filteredRows.length === 0 ? (
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="invitation"
                title={isFiltered ? "No matching grants" : "No client access grants"}
                description={
                  isFiltered
                    ? "Try adjusting or clearing the active filters."
                    : "Grant clients read-only visibility into project milestones, tasks, and more."
                }
                action={
                  isFiltered
                    ? { label: "Clear filters", onClick: handleResetFilters }
                    : canManage
                      ? { label: "Grant Access", onClick: handleOpenCreate }
                      : undefined
                }
              />
            ) : (
              <>
                {canManage && selectedGrantIds.size > 0 && (
                  <div className={cn(PM_TOOLBAR, "mb-2 rounded-lg border border-border/80 bg-card px-3 py-2")}>
                    <span className="text-sm font-medium">{selectedGrantIds.size} selected</span>
                    <div className="flex items-center gap-2">
                      <Button variant="destructive" size="sm" onClick={handleBulkRevokeConfirm}>
                        Revoke selected
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Clear selection" onClick={handleKeyboardClear}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <DataTable
                  data={filteredRows}
                  columns={columns}
                  getRowKey={(row) => row.projectClientGrantId}
                  minWidth="680px"
                  className={CONTENT_FILL_PANEL}
                  mobileCard={(row) => {
                    const contactName = resolveContactName(row.contactFirstName, row.contactLastName);
                    const activeFlags = VISIBILITY_FLAGS.filter((flag) => row[flag.key] === true);
                    return (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {contactName ?? "Unknown contact"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Project #{row.projectId}</p>
                          </div>
                          <SemanticBadge
                            tone={GRANT_STATUS_TONES[row.status]}
                            label={GRANT_STATUS_LABELS[row.status]}
                            size="xs"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {activeFlags.length > 0 ? activeFlags.map((flag) => (
                            <SemanticBadge key={flag.key} tone="accent" label={flag.label} size="xs" />
                          )) : <span className="text-xs text-muted-foreground">No access</span>}
                        </div>
                        {canManage ? (
                          <div className="flex justify-end">
                            <GrantRowActions
                              grant={row}
                              canManage
                              onEdit={handleEditRow}
                              onRevoke={handleRevokeRow}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  }}
                  mobileCardBreakpoint="xl"
                  selection={canManage ? {
                    selected: selectedGrantIds,
                    onChange: setSelectedGrantIds,
                    isRowSelectable: (row) => row.status === "ACTIVE" || row.status === "SUSPENDED",
                    getRowLabel: (row) => `Grant ${truncateId(row.projectClientGrantId)}`,
                  } : undefined}
                />
                {pagination && (cursorHistory.length > 1 || pagination.hasMore) ? (
                  <CursorPageControls
                    page={cursorHistory.length}
                    hasNext={pagination.hasMore}
                    disabled={isLoading}
                    onPrevious={handlePreviousPage}
                    onNext={handleNextPage}
                    className="mt-2 px-1"
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      </PageState>

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

      {revokeTarget && (
        <RevokeGrantDialog
          grant={revokeTarget}
          onOpenChange={handleRevokeDialogChange}
        />
      )}

      {bulkRevokeOpen && (
        <ConfirmDialog
          open={bulkRevokeOpen}
          onOpenChange={setBulkRevokeOpen}
          title="Revoke selected grants?"
          description={`This will revoke access for ${selectedGrantIds.size} client grant${selectedGrantIds.size === 1 ? "" : "s"}. This cannot be undone.`}
          confirmLabel="Revoke"
          destructive
          isPending={bulkRevoke.isPending}
          onConfirm={handleBulkRevoke}
        />
      )}

      <InviteClientDialog
        open={inviteOpen}
        onOpenChange={handleInviteOpenChange}
        onInvited={handlePageMembershipInvited}
      />
    </PageWrapper>
  );
}
