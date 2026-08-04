"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  usePortalProjectOverview,
  usePortalChangeRequests,
} from "@/hooks/api/build/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Diamond, CheckSquare, Paperclip, FileText } from "lucide-react";
import { DownloadIcon, PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PortalCrSheet } from "./portal-cr-sheet";
import type { ChangeRequestStatus } from "@/types/projects";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_PANEL,
  PM_ROW,
} from "@/features/build/shared/pm-chrome";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

const CR_STATUS_LABELS: Record<ChangeRequestStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  estimated: "Estimated",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In Progress",
  completed: "Completed",
};

const CR_STATUS_STYLES: Record<ChangeRequestStatus, string> = {
  submitted: "text-muted-foreground border-border bg-muted/40",
  under_review:
    "text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  estimated:
    "text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  awaiting_approval:
    "text-orange-700 border-orange-200 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  approved:
    "text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  rejected:
    "text-red-700 border-red-200 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  in_progress:
    "text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  completed:
    "text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

function SectionTitle({
  icon: Icon,
  title,
  actions,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {actions}
    </div>
  );
}

function DownloadLink({ href }: { href: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex shrink-0 items-center gap-1 text-[10px] text-primary hover:underline"
      {...hoverHandlers}
    >
      <DownloadIcon ref={iconRef} size={12} />
      Download
    </a>
  );
}

function DashboardSkeleton() {
  return (
    <PmPageShell>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <div className={cn(PM_PANEL, "space-y-2 p-2")}>
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </PmPageShell>
  );
}

interface PortalDashboardPageProps {
  projectId: number;
}

export function PortalDashboardPage({ projectId }: PortalDashboardPageProps) {
  const [crSheetOpen, setCrSheetOpen] = useState(false);

  const {
    data: overview,
    isLoading: loadingOverview,
    isError: errorOverview,
    refetch: refetchOverview,
  } = usePortalProjectOverview(projectId);

  const {
    data: changeRequests,
    isLoading: loadingCrs,
    isError: errorCrs,
    refetch: refetchCrs,
  } = usePortalChangeRequests(projectId);

  const isLoading = loadingOverview || loadingCrs;
  const isError = errorOverview || errorCrs;

  function handleRetry() {
    void refetchOverview();
    void refetchCrs();
  }

  function handleOpenCrSheet() {
    setCrSheetOpen(true);
  }

  if (isLoading) {
    return (
      <PageWrapper title="Project" backHref="/portal">
        <DashboardSkeleton />
      </PageWrapper>
    );
  }

  if (isError || !overview) {
    return (
      <PageWrapper title="Project Dashboard" backHref="/portal">
        <PmPageShell withGlow={false}>
          <ErrorState className="min-h-[14rem]" onRetry={handleRetry} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const { project, milestones, tasks, attachments } = overview;

  return (
    <PageWrapper
      title={project.name}
      backHref="/portal"
      badge={
        <Badge variant="outline" className="text-[10px] capitalize">
          {project.status}
        </Badge>
      }
    >
      <PmPageShell>
        <PmSection index={0}>
          <SectionTitle icon={Diamond} title="Milestones & Deliverables" />
          {milestones.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustrationPreset="calendar"
                title="No milestones"
                description="No milestones have been shared yet."
                compact
                className="min-h-[100px]"
              />
            </PmPanel>
          ) : (
            <PmPanel>
              {milestones.map((m) => (
                <div key={m.id} className={cn(PM_ROW, "overflow-hidden")}>
                  <TruncatedText text={m.name} className="min-w-0 flex-1 text-[11px] font-medium" />
                  {m.dueDate ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      Due{" "}
                      {new Date(m.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  ) : null}
                  {m.status ? (
                    <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                      {m.status}
                    </Badge>
                  ) : null}
                </div>
              ))}
            </PmPanel>
          )}
        </PmSection>

        <PmSection index={1}>
          <SectionTitle icon={CheckSquare} title="Tasks" />
          {tasks.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustrationPreset="ticket"
                title="No tasks"
                description="No tasks have been shared yet."
                compact
                className="min-h-[100px]"
              />
            </PmPanel>
          ) : (
            <PmPanel>
              {tasks.map((t) => (
                <div key={t.id} className={cn(PM_ROW, "overflow-hidden")}>
                  <span className="w-16 shrink-0 font-mono text-[10px] text-muted-foreground">
                    #{t.ticketNumber}
                  </span>
                  <TruncatedText text={t.title} className="min-w-0 flex-1 text-[11px]" />
                  {t.dueDate ? (
                    <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">
                      {new Date(t.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  ) : null}
                  <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                    {t.status}
                  </Badge>
                </div>
              ))}
            </PmPanel>
          )}
        </PmSection>

        <PmSection index={2}>
          <SectionTitle icon={Paperclip} title="Files" />
          {attachments.length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustrationPreset="documents"
                title="No files"
                description="No files have been shared yet."
                compact
                className="min-h-[100px]"
              />
            </PmPanel>
          ) : (
            <PmPanel>
              {attachments.map((f) => (
                <div key={f.id} className={cn(PM_ROW, "overflow-hidden")}>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <TruncatedText text={f.filename} className="min-w-0 flex-1 text-[11px]" />
                  <DownloadLink href={f.url} />
                </div>
              ))}
            </PmPanel>
          )}
        </PmSection>

        <PmSection index={3}>
          <SectionTitle
            icon={FileText}
            title="Change Requests"
            actions={
              <AnimatedIconButton
                size="sm"
                className="text-[11px]"
                onClick={handleOpenCrSheet}
                icon={PlusIcon}
                iconSize={14}
                iconClassName="mr-1"
              >
                Submit Request
              </AnimatedIconButton>
            }
          />

          {(changeRequests ?? []).length === 0 ? (
            <PmPanel className="flex items-center justify-center p-4">
              <EmptyState
                illustrationPreset="ticket"
                title="No change requests"
                description="Submit a change request if the project scope needs adjustment."
                action={{ label: "Submit Request", onClick: handleOpenCrSheet }}
                compact
                className="min-h-[100px]"
              />
            </PmPanel>
          ) : (
            <PmPanel>
              {changeRequests?.map((cr) => (
                <div key={cr.id} className={cn(PM_ROW, "overflow-hidden")}>
                  <span className="w-14 shrink-0 font-mono text-[10px] text-muted-foreground">
                    CR-{cr.crNumber}
                  </span>
                  <TruncatedText text={cr.title} className="min-w-0 flex-1 text-[11px]" />
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 text-[10px]", CR_STATUS_STYLES[cr.status])}
                  >
                    {CR_STATUS_LABELS[cr.status]}
                  </Badge>
                </div>
              ))}
            </PmPanel>
          )}
        </PmSection>
      </PmPageShell>

      <PortalCrSheet projectId={projectId} open={crSheetOpen} onOpenChange={setCrSheetOpen} />
    </PageWrapper>
  );
}
