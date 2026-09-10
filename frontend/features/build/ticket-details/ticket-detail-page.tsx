"use client";

import { useCallback, useMemo, useState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useProject } from "@/hooks/api";
import { useTicketByKey, useEpics, useModules, useCycles } from "@/hooks/api/build";
import { useProjectBoardTickets } from "@/hooks/api/build/ticket-queries";
import { formatTicketKey, parseTicketKey } from "@/components/shared/format-ticket-key";
import { TicketDetailMainSection } from "./ticket-detail-main-section";
import { TicketDetailRightPanel } from "./ticket-detail-right-panel";
import { TicketDetailToolbar } from "./ticket-detail-toolbar";
import { TicketParentControl } from "./ticket-parent-control";
import { useTicketDetail } from "./use-ticket-detail";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";


interface TicketDetailPageProps {
  projectId: number;
  ticketKey: string;
}

const RIGHT_PANEL_COLLAPSED_KEY = "streamlineos:ticket-detail:right-panel:collapsed";

function DetailSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide md:flex-row md:overflow-hidden">
      <div className="min-w-0 shrink-0 space-y-4 bg-card px-4 pb-4 pt-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:px-6 md:pb-5 md:scrollbar-hide">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="hidden shrink-0 border-t border-border px-4 py-3 md:block md:w-96 md:min-w-96 md:overflow-y-auto md:border-t-0 md:border-l md:pr-4 md:scrollbar-hide xl:w-[26rem] xl:min-w-[26rem]">
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function TicketDetailPage({ projectId, ticketKey }: TicketDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const commentParam = searchParams.get("comment");
  const highlightCommentId = commentParam ? parseInt(commentParam, 10) : null;
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(RIGHT_PANEL_COLLAPSED_KEY) === "true";
  });

  const parsed = useMemo(() => parseTicketKey(ticketKey), [ticketKey]);
  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const { data: byKeyTicket, isLoading: byKeyLoading, error: byKeyError, refetch: refetchByKey } = useTicketByKey(
    projectId,
    parsed?.ticketNumber ?? null,
    INLINE_READ_ERROR,
  );
  const ticketId = byKeyTicket?.id ?? null;

  // Warmed here, not left behind the ticket guard: the right panel and the
  // relations block are keyed on projectId alone, so waiting two round-trips
  // for them is a pure waterfall. Mobile keeps the drawer lists off (the
  // hooks' own `!!projectId` gate) because that drawer may never open.
  const sidebarWarmProjectId = isMobile ? 0 : projectId;
  useEpics(sidebarWarmProjectId);
  useModules(sidebarWarmProjectId);
  useCycles(sidebarWarmProjectId);
  useProjectBoardTickets(projectId);

  const handleDeleted = () => {
    router.push(`/build/${projectId}`);
  };

  const {
    ticket,
    isLoading,
    ticketError,
    refetchTicket,
    sprints,
    subtasks,
    members,
    statuses,
    saving,
    localTitle,
    handleTitleChange,
    handleDescriptionEditorChange,
    autoSave,
    handleDelete,
    isDeleting,
  } = useTicketDetail({ projectId, ticketId, onDeleted: handleDeleted });

  const displayKey = formatTicketKey(projectData?.key, ticket?.ticketNumber ?? parsed?.ticketNumber);

  const handleApplyAiDescription = useCallback(
    (html: string) => {
      autoSave({ description: html });
      toast.success("Description updated");
    },
    [autoSave],
  );

  function handleRightPanelOpenChange(open: boolean) {
    const collapsed = !open;
    setRightPanelCollapsed(collapsed);
    localStorage.setItem(RIGHT_PANEL_COLLAPSED_KEY, String(collapsed));
  }

  function handleExpandRightPanel() {
    handleRightPanelOpenChange(true);
  }

  if (!parsed) return notFound();

  if (projectLoading || byKeyLoading) {
    return (
      <PageWrapper title="Loading..." backHref={`/build/${projectId}`} noInternalScroll className="h-full">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (byKeyError) {
    if (isApiError(byKeyError) && getApiErrorCode(byKeyError) === "PROJECTS_FORBIDDEN_TICKET") {
      return (
        <PageWrapper title={displayKey} backHref={`/build/${projectId}`}>
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mb-1 font-medium text-foreground">Restricted Access</p>
            <p className="text-sm text-muted-foreground">
              You can only view details of tickets assigned to you.
            </p>
          </div>
        </PageWrapper>
      );
    }
    if (isApiError(byKeyError) && byKeyError.status === 404) return notFound();
    return (
      <PageWrapper title="Ticket" backHref={`/build/${projectId}`}>
        <ErrorState className="flex-1" title="Couldn't load ticket" description={getErrorMessage(byKeyError)} onRetry={refetchByKey} />
      </PageWrapper>
    );
  }

  if (!byKeyTicket) return notFound();

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." backHref={`/build/${projectId}`} noInternalScroll className="h-full">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_FORBIDDEN_TICKET") {
    return (
      <PageWrapper title={displayKey} backHref={`/build/${projectId}`}>
        <div className="px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mb-1 font-medium text-foreground">Restricted Access</p>
          <p className="text-sm text-muted-foreground">
            You can only view details of tickets assigned to you.
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_TICKET_NOT_FOUND") {
    return notFound();
  }

  if (ticketError && !ticket) {
    return (
      <PageWrapper title={displayKey} backHref={`/build/${projectId}`}>
        <ErrorState className="flex-1" title="Couldn't load ticket" description={getErrorMessage(ticketError)} onRetry={refetchTicket} />
      </PageWrapper>
    );
  }

  if (!ticket || !ticketId) {
    return (
      <PageWrapper title="Ticket not found" backHref={`/build/${projectId}`}>
        <div className="px-4 py-16 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-4 font-medium text-destructive">Ticket not found</p>
          <Button variant="outline" size="sm" onClick={() => router.push(`/build/${projectId}`)}>
            Back to board
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const pageTitle = localTitle || ticket.title;

  return (
    <PageWrapper
      title={pageTitle}
      subtitle={
        <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="shrink-0 font-mono text-label font-medium text-muted-foreground">
            {displayKey}
          </span>
          {ticket.parentTicketId != null ? (
            <>
              <span className="shrink-0 text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <TicketParentControl
                ticket={ticket}
                projectId={projectId}
                projectKey={projectData?.key}
                variant="breadcrumb"
              />
            </>
          ) : null}
        </span>
      }
      backHref={`/build/${projectId}`}
      noInternalScroll
      actionsInline
      className="h-full"
      contentClassName="flex flex-1 min-h-0 flex-col p-0"
      actions={
        <TicketDetailToolbar
          isMobile={isMobile}
          rightPanelCollapsed={rightPanelCollapsed}
          onExpandRightPanel={handleExpandRightPanel}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      }
    >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto scrollbar-hide md:flex-row md:overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-6 right-1/3 h-32 w-32 rounded-full bg-primary/[0.05] blur-3xl"
        />

        <div className="min-w-0 flex-1 bg-gradient-to-b from-card/80 to-background/40 px-4 pb-4 pt-2 md:min-h-0 md:overflow-y-auto md:px-6 md:pb-5 md:scrollbar-hide">
          <TicketDetailMainSection
            ticket={ticket}
            ticketId={ticketId}
            projectId={projectId}
            projectKey={projectData?.key}
            localTitle={localTitle}
            subtasks={subtasks}
            members={members}
            highlightCommentId={highlightCommentId}
            onApplyDescription={handleApplyAiDescription}
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescriptionEditorChange}
          />
        </div>

        <TicketDetailRightPanel
          open={!rightPanelCollapsed}
          onOpenChange={handleRightPanelOpenChange}
          displayKey={displayKey}
          saving={saving}
          ticket={ticket}
          ticketId={ticketId}
          projectId={projectId}
          projectKey={projectData?.key}
          sprints={sprints}
          statuses={statuses}
          onAutoSave={autoSave}
          asideClassName="md:w-96 md:min-w-96 xl:w-[26rem] xl:min-w-[26rem]"
        />
      </div>
    </PageWrapper>
  );
}
