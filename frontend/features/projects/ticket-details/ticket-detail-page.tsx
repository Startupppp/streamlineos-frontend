"use client";

import { useCallback, useMemo, useState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, PanelRightOpen } from "lucide-react";
import { EllipsisIcon, ShareIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useProject } from "@/hooks/api";
import { useProjectBoardTickets } from "@/hooks/api/projects";
import { formatTicketKey, parseTicketKey } from "@/features/projects/shared/format-ticket-key";
import { TicketDetailMainSection } from "./ticket-detail-main-section";
import { TicketDetailRightPanel } from "./ticket-detail-right-panel";
import { TicketDetailActions, TicketDetailDeleteDialog, TicketDetailDeleteMenuItem } from "./ticket-detail-actions";
import { TicketParentControl } from "./ticket-parent-control";
import { useTicketDetail } from "./use-ticket-detail";
import { resolveTicketId } from "./resolve-ticket-id";
import { TicketAiMenu } from "@/features/projects/ai/ticket-ai-menu";
import { useIsMobile } from "@/hooks/common/use-mobile";


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
  const [overflowDeleteOpen, setOverflowDeleteOpen] = useState(false);

  const parsed = useMemo(() => parseTicketKey(ticketKey), [ticketKey]);
  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const { data: boardTickets, isLoading: boardLoading } = useProjectBoardTickets(projectId);

  const ticketId = useMemo(() => {
    if (!parsed) return null;
    const tickets = boardTickets?.map((t) => ({ id: t.id, ticketNumber: t.ticketNumber }));
    return resolveTicketId(parsed, projectData?.key, tickets);
  }, [parsed, projectData?.key, boardTickets]);

  const handleDeleted = () => {
    router.push(`/projects/${projectId}`);
  };

  const {
    ticket,
    isLoading,
    ticketError,
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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  function handleRightPanelOpenChange(open: boolean) {
    const collapsed = !open;
    setRightPanelCollapsed(collapsed);
    localStorage.setItem(RIGHT_PANEL_COLLAPSED_KEY, String(collapsed));
  }

  function handleExpandRightPanel() {
    handleRightPanelOpenChange(true);
  }

  function handleOpenOverflowDelete() {
    setOverflowDeleteOpen(true);
  }

  if (!parsed) return notFound();

  if (projectLoading || boardLoading || (ticketId === null && projectData && boardTickets && !isLoading)) {
    if (!projectLoading && !boardLoading && projectData && boardTickets && ticketId === null) {
      return notFound();
    }
    return (
      <PageWrapper title="Loading..." backHref={`/projects/${projectId}`} noInternalScroll className="h-full">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." backHref={`/projects/${projectId}`} noInternalScroll className="h-full">
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_FORBIDDEN_TICKET") {
    return (
      <PageWrapper title={displayKey} backHref={`/projects/${projectId}`}>
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

  if (!ticket || !ticketId) {
    return (
      <PageWrapper title="Ticket not found" backHref={`/projects/${projectId}`}>
        <div className="px-4 py-16 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <p className="mb-4 font-medium text-destructive">Ticket not found</p>
          <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>
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
          <span className="shrink-0 font-mono text-[13px] font-medium text-muted-foreground">
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
      backHref={`/projects/${projectId}`}
      noInternalScroll
      actionsInline
      className="h-full"
      contentClassName="flex flex-1 min-h-0 flex-col p-0"
      actions={
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {rightPanelCollapsed ? (
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 touch-manipulation border-border/60 bg-card/50 backdrop-blur-sm sm:h-8 sm:w-8"
              onClick={handleExpandRightPanel}
              aria-label="Expand details panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          ) : null}

          {isMobile ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AnimatedIconButton
                    size="icon"
                    variant="outline"
                    icon={EllipsisIcon}
                    iconSize={16}
                    className="h-9 w-9 touch-manipulation border-border/60 bg-card/50 backdrop-blur-sm sm:h-8 sm:w-8"
                    aria-label="More actions"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent forceMount align="end" className="w-52">
                  <TicketAiMenu
                    projectId={projectId}
                    ticketId={ticketId}
                    currentDescription={ticket.description}
                    onApplyDescription={handleApplyAiDescription}
                    asSubmenu
                  />
                  <DropdownMenuItem onSelect={handleShare} className="gap-2">
                    <ShareIcon size={14} />
                    Share
                  </DropdownMenuItem>
                  <TicketDetailDeleteMenuItem onRequestDelete={handleOpenOverflowDelete} />
                </DropdownMenuContent>
              </DropdownMenu>
              <TicketDetailDeleteDialog
                open={overflowDeleteOpen}
                onOpenChange={setOverflowDeleteOpen}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            </>
          ) : (
            <>
              <TicketAiMenu
                projectId={projectId}
                ticketId={ticketId}
                currentDescription={ticket.description}
                onApplyDescription={handleApplyAiDescription}
              />
              <AnimatedIconButton
                size="icon"
                variant="outline"
                icon={ShareIcon}
                iconSize={16}
                className="h-8 w-8 touch-manipulation border-border/60 bg-card/50 backdrop-blur-sm"
                onClick={handleShare}
                aria-label="Copy share link"
              />
              <TicketDetailActions
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            </>
          )}
        </div>
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
