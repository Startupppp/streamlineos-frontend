"use client";

import { useCallback, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import {
  useProjectApprovals,
  useCreateApproval,
  useDecideApproval,
  useUpdateApproval,
  useDeleteApproval,
} from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
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

  const columns = useMemo<DataTableColumn<Approval>[]>(() => [
    {
      key: "entityType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
          {entityTypeLabel(row.entityType)}
        </Badge>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (row) => <span className="font-medium text-foreground truncate max-w-[220px] block">{row.title}</span>,
      sortable: true,
      sortValue: (row) => row.title,
    },
    {
      key: "approver",
      header: "Approver",
      cell: (row) => <span className="text-muted-foreground">{memberName(row.approverId)}</span>,
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
          <span className="text-muted-foreground tabular-nums">{row.dueAt.slice(0, 10)}</span>
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
        if (!canDecideRow && !canManage) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canDecideRow && <DropdownMenuItem onClick={() => setDecideTarget(row)}>Decide</DropdownMenuItem>}
              {canManage && DECIDABLE.has(row.status) && (
                <DropdownMenuItem onClick={() => setDelegateTarget(row)}>Delegate</DropdownMenuItem>
              )}
              {canManage && DECIDABLE.has(row.status) && row.status !== "escalated" && (
                <DropdownMenuItem onClick={() => handleEscalate(row)}>Escalate</DropdownMenuItem>
              )}
              {canManage && DECIDABLE.has(row.status) && (
                <DropdownMenuItem onClick={() => setCancelTarget(row)}>Cancel</DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(row)}>
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [canDecide, canManage, currentUserId, memberName, handleEscalate]);

  const filtersBar = (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={entityType} onValueChange={setEntityType}>
        <SelectTrigger className="h-8 w-40 text-xs">
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
      eyebrow="Project"
      subtitle="Review and manage approval requests for this project"
      filters={filtersBar}
      actions={
        canRequest ? (
          <Button size="sm" className="h-8 text-xs" onClick={() => handleOpenRequest()}>
            Request Approval
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {isLoading ? (
          <DataTableSkeleton rows={6} columns={7} className="flex-1" />
        ) : isError ? (
          <ErrorState className="flex-1" onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            illustrationPreset="approval"
            title={isFiltered ? "No matching approvals" : "No approvals yet"}
            description={
              isFiltered
                ? "No approvals match your filters."
                : "Use approvals to get sign-off on tasks, milestones, and releases before they ship."
            }
            action={
              isFiltered
                ? { label: "Clear filters", onClick: () => { setStatus("all"); setEntityType("all"); } }
                : canRequest
                  ? { label: "Request task approval", onClick: () => handleOpenRequest("task") }
                  : undefined
            }
            secondaryAction={
              !isFiltered && canRequest
                ? { label: "Request release approval", onClick: () => handleOpenRequest("release") }
                : undefined
            }
          />
        ) : (
          <DataTable data={items} columns={columns} getRowKey={(row) => row.id} minWidth="720px" className="flex-1 min-h-0" />
        )}
        {!isFiltered && items.length === 0 && canRequest && (
          <div className="flex justify-center mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7"
              onClick={() => handleOpenRequest("milestone")}
            >
              Request milestone approval
            </Button>
          </div>
        )}
      </div>

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
        onOpenChange={(open) => { if (!open) setDecideTarget(null); }}
        onConfirm={handleDecide}
        isPending={decideApproval.isPending}
        approvalTitle={decideTarget?.title}
      />
      <DelegateDialog
        open={!!delegateTarget}
        onOpenChange={(open) => { if (!open) setDelegateTarget(null); }}
        onConfirm={handleDelegate}
        isPending={updateApproval.isPending}
        members={members}
        currentApproverId={delegateTarget?.approverId}
      />
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this approval?</AlertDialogTitle>
            <AlertDialogDescription>
              The request will be marked cancelled and removed from the approver&apos;s inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>Cancel approval</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this approval?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
