"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Pencil } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useIncident, useDeleteIncident } from "@/hooks/api/build/incidents";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOrgMembers } from "@/hooks/api/organization";
import { IncidentSlaPanel } from "./incident-sla-panel";
import { IncidentTimeline } from "./incident-timeline";
import { IncidentSheet } from "./incident-sheet";
import { IncidentDecisions } from "./incident-decisions";
import { IncidentFollowUps } from "./incident-follow-ups";

/**
 * Two ladders, and both lost their orange rung: `high` and `investigating` were
 * orange before the migration, and with no orange status they collapsed onto
 * the amber below them. Everything else here means its status and keeps it.
 */
const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
  high: "text-category-orange-ink border-category-orange-rule",
  medium: "text-status-warning-ink border-status-warning-rule",
  low: "text-muted-foreground border-border",
};
const STATUS_STYLES: Record<string, string> = {
  detected: "text-status-danger-ink border-status-danger-rule",
  investigating: "text-category-orange-ink border-category-orange-rule",
  mitigating: "text-status-warning-ink border-status-warning-rule",
  resolved: "text-status-success-ink border-status-success-rule",
  postmortem: "text-status-info-ink border-status-info-rule",
  closed: "text-muted-foreground border-border",
};
const STATUS_LABELS: Record<string, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

interface IncidentDetailPageProps {
  projectId: number;
  incidentId: number;
}

function IncidentActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="text-dense" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5 mr-1" />
        Edit
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-dense text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={onDelete}
        {...hoverHandlers}
      >
        <Trash2Icon ref={iconRef} size={14} className="mr-1" />
        Delete
      </Button>
    </div>
  );
}

export function IncidentDetailPage({ projectId, incidentId }: IncidentDetailPageProps) {
  const canManage = useCan("build:incidents:manage");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: incident,
    isLoading,
    isError,
    error,
    refetch,
  } = useIncident(projectId, incidentId);
  const { data: membersData } = useOrgMembers(1, 100);
  const deleteIncident = useDeleteIncident();
  const members = membersData?.data ?? [];

  const pageState = usePageState({
    permission: "build:incidents:view",
    isLoading,
    isError,
    error,
    isEmpty: !incident,
  });

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);
  const handleDeleteDialogChange = useCallback((open: boolean) => setDeleteOpen(open), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteConfirm = useCallback(() => {
    deleteIncident.mutate(
      { projectId, incidentId },
      {
        onSuccess: () => {
          toast.success("Incident deleted");
          setDeleteOpen(false);
          if (typeof window !== "undefined") window.history.back();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteIncident, projectId, incidentId]);

  if (pageState.kind !== "ready") {
    return (
      <PageWrapper title="Incident" backHref={`/build/${projectId}/incidents`}>
        <PageState
          resolution={pageState}
          loading={
            <div className="flex min-h-0 flex-1 flex-col space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          }
          empty={
            <EmptyState
              className="flex-1"
              illustrationPreset="alert"
              title="Incident not found"
              description="This incident no longer exists, or it was deleted."
              action={{
                label: "Back to incidents",
                href: `/build/${projectId}/incidents`,
              }}
            />
          }
          onRetry={handleRetry}
        >
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (!incident) return null;

  const owner = members.find((m) => m.userId === incident.ownerId);

  return (
    <PageWrapper
      title={incident.title}
      backHref={`/build/${projectId}/incidents`}
      badge={
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-micro capitalize ${SEVERITY_STYLES[incident.severity]}`}>
            {incident.severity}
          </Badge>
          <Badge variant="outline" className={`text-micro ${STATUS_STYLES[incident.status]}`}>
            {STATUS_LABELS[incident.status]}
          </Badge>
        </div>
      }
      actions={
        canManage ? (
          <IncidentActions onEdit={handleOpenEdit} onDelete={handleOpenDelete} />
        ) : undefined
      }
    >
      <div className="space-y-5">
        <IncidentSlaPanel incident={incident} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoSection label="Impact" value={incident.impact} />
          <InfoSection label="Root Cause" value={incident.rootCause} />
          <InfoSection label="Customer Comms" value={incident.customerComms} />
          <div className="space-y-1">
            <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">Owner</p>
            <p className="text-xs">{owner ? (owner.name ?? owner.email) : "—"}</p>
          </div>
          {incident.linkedTicketId ? (
            <div className="space-y-1">
              <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">Linked Ticket</p>
              <Badge variant="outline" className="text-micro font-mono">#{incident.linkedTicketId}</Badge>
            </div>
          ) : null}
          {incident.releaseId ? (
            <div className="space-y-1">
              <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">Affected Release</p>
              <Badge variant="outline" className="text-micro font-mono">#{incident.releaseId}</Badge>
            </div>
          ) : null}
        </div>

        <IncidentTimeline
          projectId={projectId}
          incidentId={incidentId}
          updates={incident.updates}
          canManage={canManage}
        />

        <IncidentFollowUps
          projectId={projectId}
          incidentId={incidentId}
          actions={incident.followUpActions}
          canManage={canManage}
        />

        <IncidentDecisions
          projectId={projectId}
          incidentId={incidentId}
          decisions={incident.decisions}
          canManage={canManage}
        />
      </div>

      <IncidentSheet
        projectId={projectId}
        open={editOpen}
        onOpenChange={setEditOpen}
        editIncident={incident}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteDialogChange}
        title="Delete incident?"
        description={`INC-${incident.incidentNumber} will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}

function InfoSection({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-xs text-foreground">
        {value ?? <span className="italic text-muted-foreground">Not set</span>}
      </p>
    </div>
  );
}
