"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ChevronDownIcon, EllipsisIcon, PlusIcon } from "@animateicons/react/lucide";
import {
  useProjectApprovals,
  useCreateApproval,
  useDecideApproval,
  useUpdateApproval,
  useDeleteApproval,
} from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { DecideDialog } from "./decide-dialog";
import { DelegateDialog } from "./delegate-dialog";
import { RequestApprovalSheet } from "./request-approval-sheet";
import type { Approval, ApprovalEntityType, ApprovalStatus, CreateApprovalInput, DecideApprovalInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_FILL_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL } from "@/features/projects/shared/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "requested", label: "Requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "escalated", label: "Escalated" },
  { value: "cancelled", label: "Cancelled" },
];

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "task", label: "Task" },
  { value: "milestone", label: "Milestone" },
  { value: "budget", label: "Budget" },
  { value: "release", label: "Release" },
  { value: "change_request", label: "Change Request" },
  { value: "document", label: "Document" },
  { value: "timesheet", label: "Timesheet" },
  { value: "client_approval", label: "Client Approval" },
];

const DECIDABLE = new Set<ApprovalStatus>(["pending", "requested", "escalated", "changes_requested"]);

function RequestApprovalMenuButton({
  onRequestTask,
  onRequestRelease,
  onRequestMilestone,
}: {
  onRequestTask: () => void;
  onRequestRelease: () => void;
  onRequestMilestone: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs" {...hoverHandlers}>
          <PlusIcon ref={iconRef} size={14} />
          Request approval
          <ChevronDownIcon size={12} className="ml-0.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onRequestTask}>Request task approval</DropdownMenuItem>
        <DropdownMenuItem onClick={onRequestRelease}>Request release approval</DropdownMenuItem>
        <DropdownMenuItem onClick={onRequestMilestone}>Request milestone approval</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ApprovalActions({
  canDecideRow,
  canManage,
  decidable,
  isEscalated,
  onDecide,
  onDelegate,
  onEscalate,
  onCancel,
  onDelete,
}: {
  canDecideRow: boolean;
  canManage: boolean;
  decidable: boolean;
  isEscalated: boolean;
  onDecide: () => void;
  onDelegate: () => void;
  onEscalate: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  if (!canDecideRow && !canManage) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-7" aria-label="Approval actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canDecideRow ? <DropdownMenuItem onClick={onDecide}>Decide</DropdownMenuItem> : null}
        {canManage && decidable ? <DropdownMenuItem onClick={onDelegate}>Delegate</DropdownMenuItem> : null}
        {canManage && decidable && !isEscalated ? (
          <DropdownMenuItem onClick={onEscalate}>Escalate</DropdownMenuItem>
        ) : null}
        {canManage && decidable ? <DropdownMenuItem onClick={onCancel}>Cancel</DropdownMenuItem> : null}
        {canManage ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            Delete
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ProjectApprovalsPageProps {
  projectId: number;
}

export function ProjectApprovalsPage({ projectId }: ProjectApprovalsPageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const canRequest = useCan("projects:approvals:request");
  const canDecide = useCan("projects:approvals:decide");
  const canManage = useCan("projects:approvals:manage");

  const [status, setStatus] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [requestOpen, setRequestOpen] = useState(false);
  const [defaultEntityType, setDefaultEntityType] = useState<ApprovalEntityType | undefined>(undefined);
  const [decideTarget, setDecideTarget] = useState<Approval | null>(null);
  const [delegateTarget, setDelegateTarget] = useState<Approval | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Approval | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Approval | null>(null);

  const { data, isLoading, isError, refetch } = useProjectApprovals(projectId, {
    status: status === "all" ? undefined : status,
    entityType: entityType === "all" ? undefined : entityType,
  });
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const createApproval = useCreateApproval(projectId);
  const decideApproval = useDecideApproval(projectId);
  const updateApproval = useUpdateApproval(projectId);
  const deleteApproval = useDeleteApproval(projectId);

  const memberName = useCallback((userId: string | null): string => {
    if (!userId) return "—";
    const m = members.find((x) => x.userId === userId);
    return m?.name ?? m?.email ?? "Unknown";
  }, [members]);

  const handleOpenRequest = useCallback((preset?: ApprovalEntityType) => {
    setDefaultEntityType(preset);
    setRequestOpen(true);
  }, []);

  const handleRequestTask = useCallback(() => {
    handleOpenRequest("task");
  }, [handleOpenRequest]);

  const handleRequestRelease = useCallback(() => {
    handleOpenRequest("release");
  }, [handleOpenRequest]);

  const handleRequestMilestone = useCallback(() => {
    handleOpenRequest("milestone");
  }, [handleOpenRequest]);

  const handleCreate = useCallback((input: CreateApprovalInput) => {
    createApproval.mutate(input, {
      onSuccess: () => {
        toast.success("Approval requested");
        setRequestOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [createApproval]);

  const handleDecide = useCallback((input: DecideApprovalInput) => {
    if (!decideTarget) return;
    decideApproval.mutate(
      { id: decideTarget.id, ...input },
      {
        onSuccess: () => {
          toast.success("Decision submitted");
          setDecideTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [decideTarget, decideApproval]);

  const handleDelegate = useCallback((approverId: string) => {
    if (!delegateTarget) return;
    updateApproval.mutate(
      { id: delegateTarget.id, approverId },
      {
        onSuccess: () => {
          toast.success("Approval delegated");
          setDelegateTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [delegateTarget, updateApproval]);

  const handleEscalate = useCallback((row: Approval) => {
    updateApproval.mutate(
      { id: row.id, status: "escalated" },
      {
        onSuccess: () => toast.success("Approval escalated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [updateApproval]);

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    updateApproval.mutate(
      { id: cancelTarget.id, status: "cancelled" },
      {
        onSuccess: () => {
          toast.success("Approval cancelled");
          setCancelTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [cancelTarget, updateApproval]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteApproval.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Approval deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteApproval]);

  const handleClearFilters = useCallback(() => {
    setStatus("all");
    setEntityType("all");
  }, []);

  const handleDecideDialogChange = useCallback((open: boolean) => {
    if (!open) setDecideTarget(null);
  }, []);

  const handleDelegateDialogChange = useCallback((open: boolean) => {
    if (!open) setDelegateTarget(null);
  }, []);

  const handleCancelDialogChange = useCallback((open: boolean) => {
    if (!open) setCancelTarget(null);
  }, []);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const columns = useMemo<DataTableColumn<Approval>[]>(() => [
    {
      key: "entityType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="px-1.5 py-0.5 text-[10px]">
          {entityTypeLabel(row.entityType)}
        </Badge>
      ),
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <TruncatedText text={row.title} className="font-medium text-foreground" />
      ),
      sortable: true,
      sortValue: (row) => row.title,
    },
    {
      key: "approver",
      header: "Approver",
      cell: (row) => {
        const name = memberName(row.approverId);
        return (
          <TruncatedText text={name} className="max-w-[8rem] text-muted-foreground" />
        );
      },
    },
    {
      key: "level",
      header: "Level",
      cell: (row) => <span className="font-mono tabular-nums text-muted-foreground">{row.level}</span>,
      className: "w-16",
    },
    {
      key: "dueAt",
      header: "Due",
      cell: (row) =>
        row.dueAt ? (
          <span className="tabular-nums text-muted-foreground">{row.dueAt.slice(0, 10)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortable: true,
      sortValue: (row) => row.dueAt ?? "",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ApprovalStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      cell: (row) => {
        const canDecideRow = canDecide && DECIDABLE.has(row.status) && (canManage || row.approverId === currentUserId);
        return (
          <ApprovalActions
            canDecideRow={canDecideRow}
            canManage={canManage}
            decidable={DECIDABLE.has(row.status)}
            isEscalated={row.status === "escalated"}
            onDecide={() => setDecideTarget(row)}
            onDelegate={() => setDelegateTarget(row)}
            onEscalate={() => handleEscalate(row)}
            onCancel={() => setCancelTarget(row)}
            onDelete={() => setDeleteTarget(row)}
          />
        );
      },
    },
  ], [canDecide, canManage, currentUserId, memberName, handleEscalate]);

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={entityType} onValueChange={setEntityType}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const items = data ?? [];
  const isFiltered = status !== "all" || entityType !== "all";

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Review and manage approval requests for this project"
      filters={filtersBar}
      actions={
        canRequest ? (
          <RequestApprovalMenuButton
            onRequestTask={handleRequestTask}
            onRequestRelease={handleRequestRelease}
            onRequestMilestone={handleRequestMilestone}
          />
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : items.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="approval"
              title={isFiltered ? "No matching approvals" : "No approvals yet"}
              description={
                isFiltered
                  ? "No approvals match your filters."
                  : "Use approvals to get sign-off on tasks, milestones, and releases before they ship."
              }
              action={
                isFiltered ? { label: "Clear filters", onClick: handleClearFilters } : undefined
              }
            />
          ) : (
            <PmPanel className={PM_FILL_PANEL}>
              <DataTable data={items} columns={columns} getRowKey={(row) => row.id} minWidth="720px" className="min-h-0 flex-1" />
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <RequestApprovalSheet
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onSubmit={handleCreate}
        isPending={createApproval.isPending}
        projectId={projectId}
        currentUserId={currentUserId}
        defaultEntityType={defaultEntityType}
      />
      <DecideDialog
        open={!!decideTarget}
        onOpenChange={handleDecideDialogChange}
        onConfirm={handleDecide}
        isPending={decideApproval.isPending}
        approvalTitle={decideTarget?.title}
      />
      <DelegateDialog
        open={!!delegateTarget}
        onOpenChange={handleDelegateDialogChange}
        onConfirm={handleDelegate}
        isPending={updateApproval.isPending}
        members={members}
        currentApproverId={delegateTarget?.approverId}
      />
      <AlertDialog open={!!cancelTarget} onOpenChange={handleCancelDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this approval?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget?.title
                ? `"${cancelTarget.title}" will be marked cancelled and removed from the approver's inbox.`
                : "The request will be marked cancelled and removed from the approver's inbox."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>Cancel approval</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this approval?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title
                ? `"${deleteTarget.title}" will be permanently deleted.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
