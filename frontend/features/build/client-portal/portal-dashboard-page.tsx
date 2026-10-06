"use client";

import { useState } from "react";
import {
  usePortalProjectOverview,
  usePortalChangeRequests,
} from "@/hooks/api/build/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Diamond, CheckSquare, Paperclip, FileText } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PortalCrSheet } from "./portal-cr-sheet";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import {
  CR_STATUS_LABELS,
  CR_STATUS_STYLES,
  SectionTitle,
  DownloadLink,
  DashboardSkeleton,
} from "./portal-dashboard-sections";

interface PortalDashboardPageProps {
  projectId: number;
}

export function PortalDashboardPage({ projectId }: PortalDashboardPageProps) {
  const [crSheetOpen, setCrSheetOpen] = useState(false);

  const {
    data: overview,
    isLoading: loadingOverview,
    isError: isErrorOverview,
    error: overviewError,
    refetch: refetchOverview,
  } = usePortalProjectOverview(projectId);

  const {
    data: changeRequests,
    isLoading: loadingCrs,
    isError: isErrorCrs,
    error: crsError,
    refetch: refetchCrs,
  } = usePortalChangeRequests(projectId);

  const isLoading = loadingOverview || loadingCrs;
  const isError = isErrorOverview || isErrorCrs;

  const pageState = usePageState({
    permission: "build:portal:view",
    isLoading,
    isError,
    error: overviewError ?? crsError ?? undefined,
  });

  function handleRetry() {
    void refetchOverview();
    void refetchCrs();
  }

  function handleOpenCrSheet() {
    setCrSheetOpen(true);
  }

  const isReady = pageState.kind === "ready";

  return (
    <PageWrapper
      title={isReady && overview ? overview.project.name : "Project Dashboard"}
      backHref="/portal"
      badge={
        isReady && overview ? (
          <Badge variant="outline" className="text-micro capitalize">
            {overview.project.status}
          </Badge>
        ) : undefined
      }
    >
      <PageState
        resolution={pageState}
        loading={<DashboardSkeleton />}
        onRetry={handleRetry}
        className="flex-1"
      >
        {!overview ? (
          <ErrorState className="min-h-[14rem]" onRetry={handleRetry} />
        ) : (
          <>
            <PmPageShell>
              {overview.capabilities?.canViewMilestones && (
              <PmSection index={0}>
                <SectionTitle icon={Diamond} title="Milestones & Deliverables" />
                {overview.milestones.length === 0 ? (
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
                    {overview.milestones.map((m) => (
                      <div key={m.id} className={cn(PM_ROW, "overflow-hidden")}>
                        <TruncatedText text={m.name} className="min-w-0 flex-1 text-dense font-medium" />
                        {m.dueDate ? (
                          <span className="shrink-0 text-micro text-muted-foreground">
                            Due{" "}
                            {new Date(m.dueDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        ) : null}
                        {m.status ? (
                          <Badge variant="outline" className="shrink-0 text-micro capitalize">
                            {m.status}
                          </Badge>
                        ) : null}
                      </div>
                    ))}
                  </PmPanel>
                )}
              </PmSection>
              )}

              {overview.capabilities?.canViewTasks && (
              <PmSection index={1}>
                <SectionTitle icon={CheckSquare} title="Tasks" />
                {overview.tasks.length === 0 ? (
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
                    {overview.tasks.map((t) => (
                      <div key={t.id} className={cn(PM_ROW, "overflow-hidden")}>
                        <span className="w-16 shrink-0 font-mono text-micro text-muted-foreground">
                          #{t.ticketNumber}
                        </span>
                        <TruncatedText text={t.title} className="min-w-0 flex-1 text-dense" />
                        {t.dueDate ? (
                          <span className="hidden shrink-0 text-micro text-muted-foreground sm:block">
                            {new Date(t.dueDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        ) : null}
                        <Badge variant="outline" className="shrink-0 text-micro capitalize">
                          {t.status}
                        </Badge>
                      </div>
                    ))}
                  </PmPanel>
                )}
              </PmSection>
              )}

              {overview.capabilities?.canViewAttachments && (
              <PmSection index={2}>
                <SectionTitle icon={Paperclip} title="Files" />
                {overview.attachments.length === 0 ? (
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
                    {overview.attachments.map((f) => (
                      <div key={f.id} className={cn(PM_ROW, "overflow-hidden")}>
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <TruncatedText text={f.filename} className="min-w-0 flex-1 text-dense" />
                        <DownloadLink href={f.url} />
                      </div>
                    ))}
                  </PmPanel>
                )}
              </PmSection>
              )}

              {overview.capabilities?.canSubmitChangeRequests && (
              <PmSection index={3}>
                <SectionTitle
                  icon={FileText}
                  title="Change Requests"
                  actions={
                    <AnimatedIconButton
                      size="sm"
                      className="text-dense"
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
                        <span className="w-14 shrink-0 font-mono text-micro text-muted-foreground">
                          CR-{cr.crNumber}
                        </span>
                        <TruncatedText text={cr.title} className="min-w-0 flex-1 text-dense" />
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-micro", CR_STATUS_STYLES[cr.status])}
                        >
                          {CR_STATUS_LABELS[cr.status]}
                        </Badge>
                      </div>
                    ))}
                  </PmPanel>
                )}
              </PmSection>
              )}
            </PmPageShell>

            <PortalCrSheet projectId={projectId} open={crSheetOpen} onOpenChange={setCrSheetOpen} />
          </>
        )}
      </PageState>
    </PageWrapper>
  );
}
