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
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useIncident, useDeleteIncident } from "@/hooks/api/build/incidents";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { IncidentSlaPanel } from "./incident-sla-panel";
import { IncidentTimeline } from "./incident-timeline";
import { IncidentSheet } from "./incident-sheet";
import type { IncidentSeverity, IncidentStatus } from "@/types/projects";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
  high: "text-status-warning-ink border-status-warning-rule",
  medium: "text-status-warning-ink border-status-warning-rule",
  low: "text-muted-foreground border-border",
};
const STATUS_STYLES: Record<IncidentStatus, string> = {
  detected: "text-status-danger-ink border-status-danger-rule",
  investigating: "text-status-warning-ink border-status-warning-rule",
  mitigating: "text-status-warning-ink border-status-warning-rule",
  resolved: "text-status-success-ink border-status-success-rule",
  postmortem: "text-status-info-ink border-status-info-rule",
  closed: "text-muted-foreground border-border",
};
const STATUS_LABELS: Record<IncidentStatus, string> = {
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

  const { data: incident, isLoading, isError, refetch } = useIncident(projectId, incidentId);
  const { data: membersData } = useOrgMembers(1, 100);
  const deleteIncident = useDeleteIncident();
  const members = membersData?.data ?? [];

  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);
  const handleDeleteDialogChange = useCallback((open: boolean) => setDeleteOpen(open), []);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDeleteConfirm = useCallback(() => {
    deleteIncident.mutate(
      { projectId, id: incidentId },
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

  if (isLoading) {
    return (
      <PageWrapper title="Incident" backHref={`/build/${projectId}/incidents`}>
        <div className="flex min-h-0 flex-1 flex-col space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  if (isError || !incident) {
    return (
      <PageWrapper title="Incident" backHref={`/build/${projectId}/incidents`}>
        <ErrorState onRetry={handleRetry} />
      </PageWrapper>
    );
  }

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
        </div>

        <IncidentTimeline
          projectId={projectId}
          incidentId={incidentId}
          updates={incident.updates}
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
