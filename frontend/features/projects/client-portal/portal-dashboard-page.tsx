"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { usePortalProjectOverview, usePortalChangeRequests } from "@/hooks/api/projects/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Plus, Diamond, CheckSquare, Paperclip, FileText } from "lucide-react";
import { PortalCrSheet } from "./portal-cr-sheet";
import type { ChangeRequestStatus } from "@/types/projects";

const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  submitted: "Submitted", under_review: "Under Review", estimated: "Estimated",
  awaiting_approval: "Awaiting Approval", approved: "Approved", rejected: "Rejected",
  in_progress: "In Progress", completed: "Completed",
};

const CR_STATUS_STYLES: Record<ChangeRequestStatus, string> = {
  submitted: "text-muted-foreground border-border",
  under_review: "text-blue-600 border-blue-200",
  estimated: "text-amber-600 border-amber-200",
  awaiting_approval: "text-orange-600 border-orange-200",
  approved: "text-green-600 border-green-200",
  rejected: "text-red-600 border-red-200",
  in_progress: "text-blue-600 border-blue-200",
  completed: "text-emerald-700 border-emerald-300",
};

function SectionTitle({ icon: Icon, title }: { icon: ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-4 pb-6 space-y-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 3 }).map((_, j) => (
            <Skeleton key={j} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface PortalDashboardPageProps { projectId: number }

export function PortalDashboardPage({ projectId }: PortalDashboardPageProps) {
  const [crSheetOpen, setCrSheetOpen] = useState(false);

  const {
    data: overview, isLoading: loadingOverview, isError: errorOverview, refetch: refetchOverview,
  } = usePortalProjectOverview(projectId);

  const {
    data: changeRequests, isLoading: loadingCrs, isError: errorCrs, refetch: refetchCrs,
  } = usePortalChangeRequests(projectId);

  const isLoading = loadingOverview || loadingCrs;
  const isError = errorOverview || errorCrs;

  if (isLoading) {
    return (
      <PageWrapper title="Project" backHref="/projects/portal">
        <DashboardSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !overview) {
    return (
      <PageWrapper title="Project Dashboard" backHref="/projects/portal">
        <div className="px-4 pb-4">
          <ErrorState onRetry={() => { refetchOverview(); refetchCrs(); }} />
        </div>
      </PageWrapper>
    );
  }

  const { project, milestones, tasks, attachments } = overview;

  return (
    <PageWrapper
      title={project.name}
      eyebrow={project.key}
      backHref="/projects/portal"
      badge={<Badge variant="outline" className="text-[10px] capitalize">{project.status}</Badge>}
    >
      <div className="px-4 pb-8 space-y-8">
        <section>
          <SectionTitle icon={Diamond} title="Milestones & Deliverables" />
          {milestones.length === 0 ? (
            <EmptyState
              illustrationPreset="calendar"
              title="No milestones"
              description="No milestones have been shared yet."
              compact
              className="min-h-[100px]"
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-[11px] flex-1 font-medium">{m.name}</span>
                  {m.dueDate && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      Due {new Date(m.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  {m.status && (
                    <Badge variant="outline" className="text-[10px] capitalize shrink-0">{m.status}</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle icon={CheckSquare} title="Tasks" />
          {tasks.length === 0 ? (
            <EmptyState
              illustrationPreset="ticket"
              title="No tasks"
              description="No tasks have been shared yet."
              compact
              className="min-h-[100px]"
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0">
                    #{t.ticketNumber}
                  </span>
                  <span className="text-[11px] flex-1 min-w-0 truncate">{t.title}</span>
                  {t.dueDate && (
                    <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">
                      {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle icon={Paperclip} title="Files" />
          {attachments.length === 0 ? (
            <EmptyState
              illustrationPreset="documents"
              title="No files"
              description="No files have been shared yet."
              compact
              className="min-h-[100px]"
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {attachments.map((f) => (
                <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-[11px] flex-1 min-w-0 truncate">{f.filename}</span>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline shrink-0"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Change Requests</h2>
            </div>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => setCrSheetOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Submit Request
            </Button>
          </div>

          {(changeRequests ?? []).length === 0 ? (
            <EmptyState
              illustrationPreset="ticket"
              title="No change requests"
              description="Submit a change request if the project scope needs adjustment."
              action={{ label: "Submit Request", onClick: () => setCrSheetOpen(true) }}
              compact
              className="min-h-[100px]"
            />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {changeRequests?.map((cr) => (
                <div key={cr.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0">
                    CR-{cr.crNumber}
                  </span>
                  <span className="text-[11px] flex-1 min-w-0 truncate">{cr.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${CR_STATUS_STYLES[cr.status]}`}
                  >
                    {CR_STATUS_LABELS[cr.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <PortalCrSheet projectId={projectId} open={crSheetOpen} onOpenChange={setCrSheetOpen} />
    </PageWrapper>
  );
}
