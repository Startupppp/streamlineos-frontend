"use client";

import { useMemo, useState } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, PanelRightOpen, Share2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useProject } from "@/hooks/api";
import { formatTicketKey, parseTicketKey } from "@/features/projects/shared/format-ticket-key";
import { TicketDetailMainSection } from "./ticket-detail-main-section";
import { TicketDetailRightPanel } from "./ticket-detail-right-panel";
import { TicketDetailActions } from "./ticket-detail-actions";
import { useTicketDetail } from "./use-ticket-detail";
import { resolveTicketId } from "./resolve-ticket-id";

interface TicketDetailPageProps {
  projectId: number;
  ticketKey: string;
}

const RIGHT_PANEL_COLLAPSED_KEY = "streamlineos:ticket-detail:right-panel:collapsed";

function DetailSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      <div className="order-2 flex-1 space-y-4 bg-card px-4 py-4 md:order-1 md:overflow-y-auto md:px-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="order-1 w-full shrink-0 border-b border-border md:order-2 md:w-80 md:border-b-0 md:border-l lg:w-96">
        <div className="space-y-3 px-4 py-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TicketDetailPage({ projectId, ticketKey }: TicketDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const commentParam = searchParams.get("comment");
  const highlightCommentId = commentParam ? parseInt(commentParam, 10) : null;
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(RIGHT_PANEL_COLLAPSED_KEY) === "true";
  });

  const parsed = useMemo(() => parseTicketKey(ticketKey), [ticketKey]);
  const { data: projectData, isLoading: projectLoading } = useProject(projectId);

  const ticketId = useMemo(() => {
    if (!parsed) return null;
    const tickets = projectData?.tickets?.map((t) => ({ id: t.id, ticketNumber: t.ticketNumber }));
    return resolveTicketId(parsed, projectData?.key, tickets);
  }, [parsed, projectData?.key, projectData?.tickets]);

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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  function handleToggleRightPanel() {
    setRightPanelCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(RIGHT_PANEL_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  if (!parsed) return notFound();

  if (projectLoading || (ticketId === null && projectData && !isLoading)) {
    if (!projectLoading && projectData && ticketId === null) return notFound();
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

  return (
    <PageWrapper
      title={localTitle || ticket.title}
      eyebrow={projectData?.name ?? "Project"}
      backHref={`/projects/${projectId}`}
      noInternalScroll
      className="h-full"
      contentClassName="flex flex-1 min-h-0 flex-col p-0"
      actions={
        <div className="flex shrink-0 items-center gap-2">
          {rightPanelCollapsed && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleToggleRightPanel}
              aria-label="Expand details panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={handleShare}
            aria-label="Copy share link"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <TicketDetailActions
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        <div className="order-2 min-w-0 flex-1 bg-card px-4 pb-4 pt-0 md:order-1 md:overflow-y-auto md:scrollbar-thin md:px-6 md:pb-5 md:pt-0">
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

        {!rightPanelCollapsed && (
          <aside className="order-1 w-full shrink-0 border-b border-border bg-card md:order-2 md:w-80 md:min-h-0 md:border-b-0 md:border-l md:overflow-hidden lg:w-96">
            <TicketDetailRightPanel
              displayKey={displayKey}
              saving={saving}
              ticket={ticket}
              ticketId={ticketId}
              projectId={projectId}
              members={members}
              sprints={sprints}
              statuses={statuses}
              onAutoSave={autoSave}
              onToggleCollapse={handleToggleRightPanel}
            />
          </aside>
        )}
      </div>
    </PageWrapper>
  );
}
