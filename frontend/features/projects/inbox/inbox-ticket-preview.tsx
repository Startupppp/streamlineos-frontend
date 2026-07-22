"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ExternalLink, PanelRightOpen } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { useProject } from "@/hooks/api";
import { useProjectBoardTickets } from "@/hooks/api/projects";
import {
  formatTicketKey,
  parseTicketKey,
} from "@/features/projects/shared/format-ticket-key";
import { TicketDetailMainSection } from "@/features/projects/ticket-details/ticket-detail-main-section";
import { TicketDetailRightPanel } from "@/features/projects/ticket-details/ticket-detail-right-panel";
import { useTicketDetail } from "@/features/projects/ticket-details/use-ticket-detail";
import { resolveTicketId } from "@/features/projects/ticket-details/resolve-ticket-id";
import type { InboxTicketLinkTarget } from "./parse-inbox-ticket-link";

const RIGHT_PANEL_COLLAPSED_KEY =
  "streamlineos:ticket-detail:right-panel:collapsed";

interface InboxTicketPreviewProps {
  target: InboxTicketLinkTarget;
  onClose?: () => void;
}

function PreviewSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide lg:flex-row lg:overflow-hidden">
      <div className="min-w-0 flex-1 space-y-4 overflow-hidden px-4 pb-4 pt-3 lg:min-h-0 lg:overflow-y-auto lg:px-5 lg:scrollbar-hide">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <div className="shrink-0 border-t border-border px-4 py-3 lg:w-72 lg:min-w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:scrollbar-hide xl:w-80 xl:min-w-80">
        <div className="mb-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-9 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

function PreviewError({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mb-1 font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function InboxTicketPreview({
  target,
  onClose,
}: InboxTicketPreviewProps) {
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(RIGHT_PANEL_COLLAPSED_KEY) === "true";
  });

  const handleToggleRightPanel = useCallback(() => {
    setRightPanelCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(RIGHT_PANEL_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  const { data: projectData, isLoading: projectLoading } = useProject(
    target.projectId,
  );
  const { data: boardTickets, isLoading: boardLoading } =
    useProjectBoardTickets(target.ticketId == null ? target.projectId : 0);

  const resolvedTicketId = useMemo(() => {
    if (target.ticketId != null) return target.ticketId;
    if (!target.ticketKey) return null;
    const parsed = parseTicketKey(target.ticketKey);
    if (!parsed) return null;
    const tickets = boardTickets?.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
    }));
    return resolveTicketId(parsed, projectData?.key, tickets);
  }, [target.ticketId, target.ticketKey, boardTickets, projectData?.key]);

  const {
    ticket,
    saving,
    sprints,
    members,
    subtasks,
    statuses,
    autoSave,
    localTitle,
    ticketError,
    handleTitleChange,
    isLoading: ticketLoading,
    projectData: detailProject,
    handleDescriptionEditorChange,
  } = useTicketDetail({
    projectId: target.projectId,
    ticketId: resolvedTicketId,
  });

  const resolving = target.ticketId == null && (projectLoading || boardLoading);
  const isLoading = resolving || (resolvedTicketId != null && ticketLoading);
  const displayKey = formatTicketKey(
    detailProject?.key ?? projectData?.key,
    ticket?.ticketNumber,
  );
  const openHref = target.href;

  if (isLoading) return <PreviewSkeleton />;

  if (resolvedTicketId == null)
    return (
      <PreviewError
        title="Ticket not found"
        description="This notification no longer points to a resolvable ticket."
      />
    );

  if (
    isApiError(ticketError) &&
    getApiErrorCode(ticketError) === "PROJECTS_FORBIDDEN_TICKET"
  )
    return (
      <PreviewError
        title="Restricted access"
        description="You can only view details of tickets assigned to you."
      />
    );

  if (
    isApiError(ticketError) &&
    getApiErrorCode(ticketError) === "PROJECTS_TICKET_NOT_FOUND"
  )
    return (
      <PreviewError
        title="Ticket not found"
        description="This ticket may have been deleted."
      />
    );

  if (!ticket)
    return (
      <PreviewError
        title="Ticket not found"
        description="Unable to load this ticket preview."
      />
    );

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 border border-l-0 border-border px-4 py-2.5 md:px-5">
        <p className="min-w-0 flex-1 truncate font-mono text-xs font-medium text-muted-foreground">
          {displayKey}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          {rightPanelCollapsed ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={handleToggleRightPanel}
              aria-label="Expand details panel"
            >
              <PanelRightOpen className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <Link href={openHref}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open ticket
            </Link>
          </Button>
          {onClose ? (
            <AnimatedIconButton
              type="button"
              size="icon"
              variant="ghost"
              icon={XIcon}
              iconSize={16}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close preview"
            />
          ) : null}
        </div>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto scrollbar-hide lg:flex-row lg:overflow-hidden">
        <div className="min-w-0 flex-1 basis-0 overflow-hidden bg-gradient-to-b from-card/80 to-background/40 px-4 pb-4 pt-2 lg:min-h-0 lg:overflow-y-auto lg:px-5 lg:pb-5 lg:scrollbar-hide">
          <TicketDetailMainSection
            ticket={ticket}
            ticketId={resolvedTicketId}
            projectId={target.projectId}
            projectKey={detailProject?.key ?? projectData?.key}
            localTitle={localTitle}
            subtasks={subtasks}
            members={members}
            highlightCommentId={target.commentId}
            variant="preview"
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescriptionEditorChange}
          />
        </div>

        {!rightPanelCollapsed ? (
          <aside className="min-w-0 shrink-0 border-t border-border bg-card lg:min-h-0 lg:w-72 lg:min-w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:scrollbar-hide xl:w-80 xl:min-w-80">
            <TicketDetailRightPanel
              displayKey={displayKey}
              saving={saving}
              ticket={ticket}
              ticketId={resolvedTicketId}
              projectId={target.projectId}
              sprints={sprints}
              statuses={statuses}
              onAutoSave={autoSave}
              onToggleCollapse={handleToggleRightPanel}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
