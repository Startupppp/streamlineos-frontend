"use client";

import { useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, CalendarDays, FileEdit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PortalHeader } from "@/features/portal/components/portal-header";
import { ChangeRequestDialog } from "@/features/portal/components/change-request-dialog";
import { cn } from "@/lib/utils";
import type { PortalProjectOverview } from "@/features/portal/lib/portal-types";
import {
  formatPortalDate,
  formatPortalStatus,
  portalStatusStyle,
  MilestonesSection,
  DeliverablesSection,
  TasksSection,
  AttachmentsSection,
  CommentsSection,
  ApprovalsSection,
  InvoicesSection,
  RequestsSection,
} from "./portal-project-sections";

function ChangeRequestDialogTrigger({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleOpenChange = useCallback((v: boolean) => setOpen(v), []);

  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen} className="shrink-0 gap-1.5">
        <FileEdit className="h-3.5 w-3.5" />
        Request change
      </Button>
      <ChangeRequestDialog
        open={open}
        onOpenChange={handleOpenChange}
        projectId={projectId}
        projectName={projectName}
      />
    </>
  );
}

function BackToProjects() {
  return (
    <Link
      href="/client-portal"
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      All projects
    </Link>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-4 w-12 rounded" />
        </div>
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function PortalProjectDetailShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PortalHeader showProjectsLink />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

export function PortalProjectDetailLoading() {
  return (
    <PortalProjectDetailShell>
      <Skeleton className="h-4 w-24 mb-6" />
      <OverviewSkeleton />
    </PortalProjectDetailShell>
  );
}

interface PortalProjectDetailErrorProps {
  onRetry: () => void;
}

export function PortalProjectDetailError({ onRetry }: PortalProjectDetailErrorProps) {
  return (
    <PortalProjectDetailShell>
      <BackToProjects />
      <ErrorState
        title="Could not load project"
        description="There was a problem loading this project. Please try again."
        onRetry={onRetry}
        className="min-h-[320px]"
      />
    </PortalProjectDetailShell>
  );
}

export function PortalProjectDetailNotFound() {
  return (
    <PortalProjectDetailShell>
      <BackToProjects />
      <EmptyState
        illustrationPreset="projects"
        title="Project not found"
        description="This project is not available. Please check your access or contact the project team."
        action={{ label: "Back to projects", href: "/client-portal" }}
        className="min-h-[320px]"
      />
    </PortalProjectDetailShell>
  );
}

interface PortalProjectDetailProps {
  data: PortalProjectOverview;
}

const NO_CAPABILITIES = {
  canViewMilestones: false,
  canViewTasks: false,
  canViewAttachments: false,
  canViewComments: false,
  canSubmitChangeRequests: false,
  canViewApprovals: false,
  canViewInvoices: false,
  canViewRequests: false,
} as const;

export function PortalProjectDetail({ data }: PortalProjectDetailProps) {
  const { project, milestones, tasks, attachments, comments, deliverables, approvals, invoices, requests } = data;
  const capabilities = data.capabilities ?? NO_CAPABILITIES;
  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold uppercase tracking-wide",
                  portalStatusStyle(project.status),
                )}
              >
                {formatPortalStatus(project.status)}
              </span>
              <span className="text-micro font-mono text-muted-foreground">{project.key}</span>
            </div>
            <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
            {project.description && (
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            )}
            {(project.startDate ?? project.targetEndDate) && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {project.startDate && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Started {formatPortalDate(project.startDate)}
                  </span>
                )}
                {project.targetEndDate && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Target {formatPortalDate(project.targetEndDate)}
                  </span>
                )}
              </div>
            )}
          </div>
          {capabilities.canSubmitChangeRequests && (
            <ChangeRequestDialogTrigger projectId={project.id} projectName={project.name} />
          )}
        </div>
      </div>

      <div className="space-y-8">
        {capabilities.canViewMilestones && <MilestonesSection milestones={milestones} />}
        {capabilities.canViewMilestones && deliverables.length > 0 && (
          <DeliverablesSection deliverables={deliverables} />
        )}
        {capabilities.canViewTasks && <TasksSection tasks={tasks} />}
        {capabilities.canViewAttachments && <AttachmentsSection attachments={attachments} />}
        {capabilities.canViewComments && <CommentsSection comments={comments} />}
        {capabilities.canViewApprovals && <ApprovalsSection approvals={approvals} />}
        {capabilities.canViewInvoices && <InvoicesSection invoices={invoices} />}
        {capabilities.canViewRequests && <RequestsSection requests={requests} />}
      </div>
    </>
  );
}
