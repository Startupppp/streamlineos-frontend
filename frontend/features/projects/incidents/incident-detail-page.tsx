"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIncident, useDeleteIncident } from "@/hooks/api/projects/incidents";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { IncidentSlaPanel } from "./incident-sla-panel";
import { IncidentTimeline } from "./incident-timeline";
import { IncidentSheet } from "./incident-sheet";
import type { IncidentSeverity, IncidentStatus } from "@/types/projects";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: "text-red-700 border-red-300 bg-red-50",
  high: "text-orange-600 border-orange-200",
  medium: "text-amber-600 border-amber-200",
  low: "text-slate-500 border-slate-200",
};
const STATUS_STYLES: Record<IncidentStatus, string> = {
  detected: "text-red-600 border-red-200",
  investigating: "text-orange-600 border-orange-200",
  mitigating: "text-amber-600 border-amber-200",
  resolved: "text-emerald-600 border-emerald-200",
  postmortem: "text-blue-600 border-blue-200",
  closed: "text-slate-400 border-slate-200",
};
const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

interface IncidentDetailPageProps {
  projectId: number;
  incidentId: number;
}

export function IncidentDetailPage({ projectId, incidentId }: IncidentDetailPageProps) {
  const canManage = useCan("projects:incidents:manage");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: incident, isLoading, isError, refetch } = useIncident(projectId, incidentId);
  const { data: membersData } = useOrgMembers(1, 100);
  const deleteIncident = useDeleteIncident();
  const members = membersData?.data ?? [];

  function handleDeleteConfirm() {
    deleteIncident.mutate(
      { projectId, id: incidentId },
      {
        onSuccess: () => {
          toast.success("Incident deleted");
          setDeleteOpen(false);
          if (typeof window !== "undefined") window.history.back();
        },
        onError: () => toast.error("Failed to delete incident"),
      },
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Incident" eyebrow="Quality" backHref={`/projects/${projectId}/incidents`}>
        <div className="px-4 pb-4 space-y-4">
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
      <PageWrapper title="Incident" eyebrow="Quality" backHref={`/projects/${projectId}/incidents`}>
        <div className="px-4 pb-4">
          <ErrorState onRetry={() => void refetch()} />
        </div>
      </PageWrapper>
    );
  }

  const owner = members.find((m) => m.userId === incident.ownerId);

  return (
    <PageWrapper
      eyebrow={`INC-${incident.incidentNumber}`}
      title={incident.title}
      backHref={`/projects/${projectId}/incidents`}
      badge={
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[10px] capitalize ${SEVERITY_STYLES[incident.severity]}`}>
            {incident.severity}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[incident.status]}`}>
            {STATUS_LABELS[incident.status]}
          </Badge>
        </div>
      }
      actions={
        canManage ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="px-4 pb-6 space-y-5">
        <IncidentSlaPanel incident={incident} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoSection label="Impact" value={incident.impact} />
          <InfoSection label="Root Cause" value={incident.rootCause} />
          <InfoSection label="Customer Comms" value={incident.customerComms} />
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Owner</p>
            <p className="text-[12px]">{owner ? (owner.name ?? owner.email) : "—"}</p>
          </div>
          {incident.linkedTicketId && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Linked Ticket</p>
              <Badge variant="outline" className="text-[10px] font-mono">#{incident.linkedTicketId}</Badge>
            </div>
          )}
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete incident?</AlertDialogTitle>
            <AlertDialogDescription>
              INC-{incident.incidentNumber} will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

function InfoSection({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[12px] text-foreground whitespace-pre-wrap">
        {value ?? <span className="italic text-muted-foreground">Not set</span>}
      </p>
    </div>
  );
}
