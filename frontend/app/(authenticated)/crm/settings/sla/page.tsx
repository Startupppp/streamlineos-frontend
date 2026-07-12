"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Shield, CheckCircle2, XCircle, Clock, AlertTriangle, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
  low: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

interface PolicyRowActionsProps {
  policy: SlaPolicyItem;
  onEdit: (policy: SlaPolicyItem) => void;
  onDeleteRequest: (id: number) => void;
}

function PolicyRowActions({ policy, onEdit, onDeleteRequest }: PolicyRowActionsProps) {
  const editIcon = useAnimatedIcon();
  const deleteIcon = useAnimatedIcon();

  const handleEdit = useCallback(() => onEdit(policy), [policy, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(policy.id), [policy.id, onDeleteRequest]);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleEdit}
        aria-label="Edit"
        {...editIcon.hoverHandlers}
      >
        <PencilIcon ref={editIcon.iconRef} size={14} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive"
        onClick={handleDeleteRequest}
        aria-label="Delete"
        {...deleteIcon.hoverHandlers}
      >
        <Trash2Icon ref={deleteIcon.iconRef} size={14} />
      </Button>
    </div>
  );
}

interface SlaTableRowProps {
  policy: SlaPolicyItem;
  onEdit: (policy: SlaPolicyItem) => void;
  onDeleteRequest: (id: number) => void;
}

function SlaTableRow({ policy, onEdit, onDeleteRequest }: SlaTableRowProps) {
  return (
    <TableRow className="h-8 hover:bg-muted/30 transition-colors">
      <TableCell className="text-[11px] px-2 py-1 font-medium">{policy.name}</TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        <Badge
          variant="outline"
          className="text-[9px] h-4 px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200 capitalize"
        >
          {policy.appliesTo}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] h-4 px-1.5 py-0 capitalize",
            PRIORITY_BADGE[policy.priority] ?? PRIORITY_BADGE["medium"]
          )}
        >
          {policy.priority}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right font-mono tabular-nums">
        {policy.firstResponseHours}h
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right font-mono tabular-nums">
        {policy.resolutionHours}h
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right">
        <PolicyRowActions policy={policy} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />
      </TableCell>
    </TableRow>
  );
}

function BreachedLeadsTable({ leads }: { leads: Array<{ id: number; name: string; status: string; slaDeadline: string | null }> }) {
  return (
    <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          Recent SLA Breaches ({leads.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            <TableRow className="border-b-2 border-border hover:bg-transparent">
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Lead</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Breached At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id} className="h-8 hover:bg-muted/30 transition-colors">
                <TableCell className="text-[11px] px-2 py-1 font-medium">
                  <Link
                    href={`/crm/leads/${lead.id}`}
                    className="hover:underline text-foreground"
                  >
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell className="text-[11px] px-2 py-1">
                  <Badge
                    variant="outline"
                    className="text-[9px] h-4 px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200"
                  >
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-[11px] px-2 py-1 text-right text-red-700 font-mono tabular-nums">
                  {lead.slaDeadline
                    ? new Date(lead.slaDeadline).toLocaleDateString()
                    : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function SlaPage() {
  const { data: policies, isLoading, isError, refetch } = useSlaPolicies();
  const { data: slaReport, isLoading: reportLoading } = useSlaReport();
  const { data: breachedLeads, isLoading: breachesLoading } = useSlaBreachedLeads({ limit: 10 });

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

  const newPolicyIcon = useAnimatedIcon();
  const isPending = createPolicy.isPending || updatePolicy.isPending;
  const pageLoading = isLoading || reportLoading;

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
          <EmptyState
            illustrationPreset="error"
            title="Failed to load SLA policies"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-6">
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

            <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-semibold">Policies</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {policies && policies.length > 0 ? (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <TableRow className="border-b-2 border-border hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Name
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Applies To
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">
                          Priority
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">
                          First Response
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">
                          Resolution
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map((policy) => (
                        <SlaTableRow
                          key={policy.id}
                          policy={policy}
                          onEdit={handleStartEdit}
                          onDeleteRequest={handleDeleteRequest}
                        />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-14 px-4">
                    <EmptyState
                      illustrationPreset="security"
                      title="No SLA policies defined"
                      description="Create a policy to track response and resolution time commitments."
                      action={{ label: "New Policy", onClick: handleOpenNew }}
                      className="border-0 bg-transparent"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {breachesLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : breachedLeads && breachedLeads.length > 0 ? (
              <BreachedLeadsTable leads={breachedLeads} />
            ) : (
              <Card className="bg-card rounded-xl border border-border shadow-sm">
                <CardContent className="py-8 px-4 text-center">
                  <p className="text-sm text-muted-foreground">No SLA breaches in the last 30 days.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
