"use client";

import { useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Milestone,
  CheckSquare,
  Paperclip,
  MessageSquare,
  FileEdit,
  Download,
  CalendarDays,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PortalHeader } from "@/features/portal/components/portal-header";
import { ChangeRequestDialog } from "@/features/portal/components/change-request-dialog";
import { cn } from "@/lib/utils";
import type {
  PortalMilestone,
  PortalTask,
  PortalAttachment,
  PortalComment,
  PortalProjectOverview,
} from "@/features/portal/lib/portal-types";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-status-info-surface text-status-info-ink",
  completed: "bg-status-success-surface text-status-success-ink",
  on_hold: "bg-status-warning-surface text-status-warning-ink",
  cancelled: "bg-status-danger-surface text-status-danger-ink",
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-status-info-surface text-status-info-ink",
  done: "bg-status-success-surface text-status-success-ink",
};

export function formatPortalStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function portalStatusStyle(status: string): string {
  return STATUS_STYLES[status.toLowerCase()] ?? "bg-muted text-muted-foreground";
}

export function formatPortalDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPortalFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SectionHeader({
  icon,
  title,
  count,
  titleId,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  titleId?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/5 text-muted-foreground">
        {icon}
      </div>
      <h2 id={titleId} className="text-sm font-semibold text-foreground">{title}</h2>
      {count !== undefined && (
        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function MilestonesSection({ milestones }: { milestones: PortalMilestone[] }) {
  if (milestones.length === 0)
    return (
      <EmptyState
        compact
        illustrationPreset="default"
        title="No milestones"
        description="No milestones have been shared for this project."
      />
    );
  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {milestones.map((m) => (
        <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
          <span className="text-sm text-foreground min-w-0 truncate">{m.name}</span>
          <div className="flex items-center gap-3 shrink-0">
            {m.dueDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatPortalDate(m.dueDate)}
              </span>
            )}
            {m.status && (
              <span
                className={cn(
                  "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold",
                  portalStatusStyle(m.status),
                )}
              >
                {formatPortalStatus(m.status)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TasksSection({ tasks }: { tasks: PortalTask[] }) {
  if (tasks.length === 0)
    return (
      <EmptyState
        compact
        illustrationPreset="default"
        title="No tasks"
        description="No tasks have been shared for this project."
      />
    );
  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {tasks.map((t) => (
        <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-sm text-foreground truncate block">{t.title}</span>
            {t.assigneeName && (
              <span className="text-xs text-muted-foreground">{t.assigneeName}</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {t.dueDate && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarDays className="h-3 w-3" />
                {formatPortalDate(t.dueDate)}
              </span>
            )}
            <span
              className={cn(
                "inline-flex px-1.5 py-0.5 rounded text-micro font-semibold",
                portalStatusStyle(t.status),
              )}
            >
              {formatPortalStatus(t.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AttachmentsSection({ attachments }: { attachments: PortalAttachment[] }) {
  if (attachments.length === 0)
    return (
      <EmptyState
        compact
        illustrationPreset="default"
        title="No attachments"
        description="No files have been shared for this project."
      />
    );
  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-card gap-4">
          <div className="min-w-0 flex-1">
            <span className="text-sm text-foreground truncate block">{a.filename}</span>
            <span className="text-xs text-muted-foreground">
              {a.uploadedByName ? `Shared by ${a.uploadedByName} · ` : ""}
              {formatPortalDate(a.uploadedAt ?? null)}
              {a.sizeBytes != null ? ` · ${formatPortalFileSize(a.sizeBytes)}` : ""}
            </span>
          </div>
          <a
            href={a.url}
            download={a.filename}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download ${a.filename}`}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        </div>
      ))}
    </div>
  );
}

function CommentsSection({ comments }: { comments: PortalComment[] }) {
  if (comments.length === 0)
    return (
      <EmptyState
        compact
        illustrationPreset="default"
        title="No updates yet"
        description="Project updates from the team will appear here."
      />
    );
  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-foreground">
              {c.authorName ?? "Team member"}
            </span>
            <span className="text-micro text-muted-foreground">
              {formatPortalDate(c.createdAt)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {c.body}
          </p>
        </div>
      ))}
    </div>
  );
}

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
} as const;

export function PortalProjectDetail({ data }: PortalProjectDetailProps) {
  const { project, milestones, tasks, attachments, comments } = data;
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
        {capabilities.canViewMilestones && (
          <section aria-labelledby="milestones-heading">
            <SectionHeader
              icon={<Milestone className="h-3.5 w-3.5" />}
              titleId="milestones-heading"
              title="Milestones"
              count={milestones.length}
            />
            <MilestonesSection milestones={milestones} />
          </section>
        )}
        {capabilities.canViewTasks && (
          <section aria-labelledby="tasks-heading">
            <SectionHeader
              icon={<CheckSquare className="h-3.5 w-3.5" />}
              titleId="tasks-heading"
              title="Tasks"
              count={tasks.length}
            />
            <TasksSection tasks={tasks} />
          </section>
        )}
        {capabilities.canViewAttachments && (
          <section aria-labelledby="attachments-heading">
            <SectionHeader
              icon={<Paperclip className="h-3.5 w-3.5" />}
              titleId="attachments-heading"
              title="Files"
              count={attachments.length}
            />
            <AttachmentsSection attachments={attachments} />
          </section>
        )}
        {capabilities.canViewComments && (
          <section aria-labelledby="comments-heading">
            <SectionHeader
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              titleId="comments-heading"
              title="Updates"
              count={comments.length}
            />
            <CommentsSection comments={comments} />
          </section>
        )}
      </div>
    </>
  );
}
