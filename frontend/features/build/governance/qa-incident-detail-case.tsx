"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { IncidentSlaPanel } from "@/features/build/incidents/incident-sla-panel";

const GALLERY_DETAIL_INCIDENT = {
  id: 301,
  orgId: "org_gallery",
  projectId: 1,
  incidentNumber: 301,
  title: "API timeout on checkout endpoint",
  description: null,
  severity: "critical" as const,
  status: "investigating" as const,
  impact: "Customers cannot complete purchases",
  ownerId: "user_priya",
  rootCause: null,
  customerComms: null,
  detectedAt: "2026-09-26T10:00:00.000Z",
  respondedAt: "2026-09-26T10:15:00.000Z",
  resolvedAt: null,
  responseDueAt: "2026-09-26T10:30:00.000Z",
  resolutionDueAt: "2026-09-26T14:00:00.000Z",
  linkedTicketId: null,
  releaseId: null,
  createdBy: null,
  createdAt: "2026-09-26T10:00:00.000Z",
  updatedAt: "2026-09-26T10:15:00.000Z",
  deletedAt: null,
};

export function IncidentDetailCase() {
  return (
    <GalleryCase id="incident-detail" title="Incident detail · severity + SLA panel">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-foreground">
              INC-{GALLERY_DETAIL_INCIDENT.incidentNumber} {GALLERY_DETAIL_INCIDENT.title}
            </h2>
          </div>
          <Button size="sm" variant="outline" type="button">
            <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-center gap-2">
            <span className="rounded border border-status-danger-rule bg-status-danger-surface px-1.5 py-0.5 text-xs font-medium uppercase text-status-danger-ink-strong">
              {GALLERY_DETAIL_INCIDENT.severity}
            </span>
            <span className="rounded border border-category-orange-rule px-1.5 py-0.5 text-xs font-medium text-category-orange-ink">
              Investigating
            </span>
          </div>
          <IncidentSlaPanel incident={GALLERY_DETAIL_INCIDENT} />
        </div>
      </div>
    </GalleryCase>
  );
}
