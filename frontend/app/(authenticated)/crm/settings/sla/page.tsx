"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Shield, CheckCircle2, XCircle, Clock, AlertTriangle, Pencil } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useSlaPolicies, useSlaReport, useSlaBreachedLeads,
  useCreateSlaPolicy, useUpdateSlaPolicy, useDeleteSlaPolicy,
} from "@/hooks/api/crm-settings";
import {
  SlaPolicySheet, buildSlaPolicyPayload,
  type SlaPolicyItem, type SlaPolicyFormValues,
} from "@/features/crm/settings/sla-policy-sheet";
import { toast } from "sonner";

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  medium: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  // A four-step ladder needs four steps. `high` was orange before the
  // migration and there is no orange status, so it collapsed onto `medium`'s
  // amber; the categorical orange restores the rung. The other three keep
  // status tokens, because there the meaning *is* the status.
  high: "bg-category-orange-surface text-category-orange-ink border-category-orange-rule",
  urgent: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

interface PolicyRowActionsProps {
  policy: SlaPolicyItem;
  onEdit: (policy: SlaPolicyItem) => void;
  onDeleteRequest: (id: number) => void;
}

function PolicyRowActions({ policy, onEdit, onDeleteRequest }: PolicyRowActionsProps) {
  const deleteIcon = useAnimatedIcon();

  const handleEdit = useCallback(() => onEdit(policy), [policy, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(policy.id), [policy.id, onDeleteRequest]);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="w-7"
        onClick={handleEdit}
        aria-label="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 text-destructive"
        onClick={handleDeleteRequest}
        aria-label="Delete"
        {...deleteIcon.hoverHandlers}
      >
        <Trash2Icon ref={deleteIcon.iconRef} size={14} />
      </Button>
    </div>
  );
}

type BreachedLead = { id: number; name: string; status: string; slaDeadline: string | null };

function buildBreachedColumns(): DataTableColumn<BreachedLead>[] {
  return [
    {
      key: "lead",
      header: "Lead",
      cell: (row): ReactNode => (
        <Link href={`/crm/leads/${row.id}`} className="text-dense font-medium hover:underline text-foreground">
          {row.name}
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row): ReactNode => (
        <Badge variant="outline" className="text-micro h-4 px-1.5 py-0 bg-muted text-muted-foreground border-border">
          {row.status}
        </Badge>
      ),
    },
    {
      key: "breachedAt",
      header: "Breached At",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row): ReactNode => (
        <span className="text-dense text-status-danger-ink font-mono tabular-nums">
          {row.slaDeadline ? new Date(row.slaDeadline).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ];
}

function BreachedLeadsTable({ leads }: { leads: BreachedLead[] }) {
  const getKey = useCallback((row: BreachedLead) => String(row.id), []);
  const columns = buildBreachedColumns();

  return (
    <Card className="bg-card rounded-xl border border-border shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-status-danger-ink" />
          Recent SLA Breaches ({leads.length})
        </CardTitle>
      </CardHeader>
      <DataTable data={leads} columns={columns} getRowKey={getKey} />
    </Card>
  );
}

function buildPolicyColumns(
  onEdit: (policy: SlaPolicyItem) => void,
  onDeleteRequest: (id: number) => void,
): DataTableColumn<SlaPolicyItem>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (row): ReactNode => (
        <span className="text-dense font-medium">{row.name}</span>
      ),
    },
    {
      key: "appliesTo",
      header: "Applies To",
      cell: (row): ReactNode => (
        <Badge variant="outline" className="text-micro h-4 px-1.5 py-0 bg-muted text-muted-foreground border-border capitalize">
          {row.appliesTo}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (row): ReactNode => (
        <Badge
          variant="outline"
          className={cn("text-micro h-4 px-1.5 py-0 capitalize", PRIORITY_BADGE[row.priority] ?? PRIORITY_BADGE["medium"])}
        >
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "firstResponse",
      header: "First Response",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row): ReactNode => (
        <span className="text-dense font-mono tabular-nums">{row.firstResponseHours}h</span>
      ),
    },
    {
      key: "resolution",
      header: "Resolution",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row): ReactNode => (
        <span className="text-dense font-mono tabular-nums">{row.resolutionHours}h</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row): ReactNode => (
        <PolicyRowActions policy={row} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />
      ),
    },
  ];
}

export default function SlaPage() {
  const { data: policies, isLoading, isError, refetch, access } = useSlaPolicies();
  const { data: slaReport, isLoading: reportLoading } = useSlaReport();
  const { data: breachedLeads, isLoading: breachesLoading, access: breachesAccess } = useSlaBreachedLeads({ limit: 10 });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicyItem | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createPolicy = useCreateSlaPolicy();
  const updatePolicy = useUpdateSlaPolicy();
  const deletePolicy = useDeleteSlaPolicy();

  const handleOpenNew = useCallback(() => {
    setEditingPolicy(null);
    setSheetOpen(true);
  }, []);

  const handleStartEdit = useCallback((policy: SlaPolicyItem) => {
    setEditingPolicy(policy);
    setSheetOpen(true);
  }, []);

  const handleSheetSubmit = useCallback(
    (data: SlaPolicyFormValues) => {
      const payload = buildSlaPolicyPayload(data);
      if (editingPolicy) {
        updatePolicy.mutate(
          { id: editingPolicy.id, ...payload },
          {
            onSuccess: () => {
              toast.success("Policy updated");
              setSheetOpen(false);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          }
        );
      } else {
        createPolicy.mutate(payload, {
          onSuccess: () => {
            toast.success("SLA policy created");
            setSheetOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [editingPolicy, updatePolicy, createPolicy]
  );

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deletePolicy.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Policy deleted");
        setDeleteTargetId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeleteTargetId(null);
      },
    });
  }, [deletePolicy, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAlertOpenChange = useCallback(
    (open: boolean) => { if (!open) handleDeleteCancel(); },
    [handleDeleteCancel]
  );

  const getPolicyKey = useCallback((p: SlaPolicyItem) => String(p.id), []);

  const newPolicyIcon = useAnimatedIcon();
  const isPending = createPolicy.isPending || updatePolicy.isPending;
  const pageLoading = isLoading || reportLoading;

  const columns = buildPolicyColumns(handleStartEdit, handleDeleteRequest);

  const policyEmptyState = (
    <div className="py-14 px-4">
      <EmptyState
        access={access}
        illustrationPreset="security"
        title="No SLA policies defined"
        description="Create a policy to track response and resolution time commitments."
        action={{ label: "New Policy", onClick: handleOpenNew }}
        className="border-0 bg-transparent"
      />
    </div>
  );

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SLA Policy</AlertDialogTitle>
            <AlertDialogDescription>
              This policy will be permanently deleted. Leads and deals will no longer be tracked against it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SlaPolicySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editingPolicy}
        isPending={isPending}
        onSubmit={handleSheetSubmit}
      />

      <PageWrapper
        title="SLA Policies"
        subtitle="Define response and resolution time commitments for leads and deals"
        actions={
          <LoadingButton
            isPending={false}
            onClick={handleOpenNew}
            {...newPolicyIcon.hoverHandlers}
          >
            <PlusIcon ref={newPolicyIcon.iconRef} size={14} className="mr-1.5" />
            New Policy
          </LoadingButton>
        }
      >
        {pageLoading ? (
          <div className="space-y-4">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load SLA policies"
            description="The policy list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            {slaReport && (
              <StatCardGrid cols={4}>
                <StatCard
                  label="Active Policies"
                  value={policies?.length ?? 0}
                  icon={Shield}
                  tone="blue"
                />
                <StatCard
                  label="Compliant"
                  value={slaReport.compliant}
                  icon={CheckCircle2}
                  tone="emerald"
                />
                <StatCard
                  label="Breached (30d)"
                  value={slaReport.breached}
                  icon={XCircle}
                  tone="red"
                />
                <StatCard
                  label="Compliance Rate"
                  value={`${slaReport.complianceRate}%`}
                  icon={Clock}
                  tone={
                    slaReport.complianceRate >= 80
                      ? "emerald"
                      : slaReport.complianceRate >= 50
                      ? "amber"
                      : "red"
                  }
                />
              </StatCardGrid>
            )}

            <DataTable
              data={policies ?? []}
              columns={columns}
              getRowKey={getPolicyKey}
              isLoading={isLoading}
              emptyState={policyEmptyState}
            />

            {breachesLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : breachedLeads && breachedLeads.length > 0 ? (
              <BreachedLeadsTable leads={breachedLeads} />
            ) : (
              <Card className="bg-card rounded-xl border border-border shadow-sm">
                <EmptyState
                  access={breachesAccess}
                  compact
                  illustrationPreset="security"
                  title="No breaches in the last 30 days"
                  description="Every lead was answered and resolved inside its policy window."
                  className="py-6"
                />
              </Card>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
