"use client";

import { useMemo } from "react";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Share2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useProject } from "@/hooks/api";
import { formatTicketKey, parseTicketKey } from "@/features/projects/shared/format-ticket-key";
import { PriorityBadge } from "../shared/priority-badge";
import { StatusBadge } from "../shared/status-badge";
import { TicketSidebar } from "./ticket-sidebar";
import { TicketDetailMainSection } from "./ticket-detail-main-section";
import { TicketDetailActions } from "./ticket-detail-actions";
import { useTicketDetail } from "./use-ticket-detail";
import { resolveTicketId } from "./resolve-ticket-id";

interface TicketDetailPageProps {
  projectId: number;
  ticketKey: string;
}

function DetailSkeleton() {
  return (
    <div className="px-4 pb-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 lg:w-[65%] space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="lg:w-[35%] space-y-3">
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

  if (!parsed) return notFound();

  if (projectLoading || (ticketId === null && projectData && !isLoading)) {
    if (!projectLoading && projectData && ticketId === null) return notFound();
    return (
      <PageWrapper title="Loading..." backHref={`/projects/${projectId}`}>
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Loading..." backHref={`/projects/${projectId}`}>
        <DetailSkeleton />
      </PageWrapper>
    );
  }

  if (isApiError(ticketError) && getApiErrorCode(ticketError) === "PROJECTS_FORBIDDEN_TICKET") {
    return (
      <PageWrapper title={displayKey} backHref={`/projects/${projectId}`}>
        <div className="px-4 py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground mb-1">Restricted Access</p>
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
          <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-destructive font-medium mb-4">Ticket not found</p>
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
      badge={
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="font-mono text-[11px] h-5 px-1.5">
            {displayKey}
          </Badge>
          <StatusBadge status={ticket.status ?? "TODO"} />
          <PriorityBadge priority={ticket.priority ?? "MEDIUM"} showLabel size="sm" />
          {saving && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving
            </span>
          )}
        </div>
      }
      actions={
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleShare}
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <TicketDetailActions
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </div>
      }
    >
      <div className="px-4 pb-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <div className="flex-1 min-w-0 lg:w-[65%] order-2 lg:order-1">
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

          <aside className="lg:w-[35%] shrink-0 order-1 lg:order-2">
            <div className="lg:sticky lg:top-4 rounded-xl border border-border bg-card shadow-sm">
              <TicketSidebar
                ticket={ticket}
                ticketId={ticketId}
                projectId={projectId}
                members={members}
                sprints={sprints}
                statuses={statuses}
                onAutoSave={autoSave}
              />
            </div>
          </aside>
        </div>
      </div>
    </PageWrapper>
  );
}
