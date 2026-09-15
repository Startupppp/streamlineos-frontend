"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ExternalLink, PanelRightOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { useProject } from "@/hooks/api";
import { useTicketByKey } from "@/hooks/api/build";
import {
  formatTicketKey,
  parseTicketKey,
} from "@/components/shared/format-ticket-key";
import { TicketDetailMainSection } from "@/features/build/ticket-details/ticket-detail-main-section";
import { TicketDetailRightPanel } from "@/features/build/ticket-details/ticket-detail-right-panel";
import { TicketParentLink } from "@/features/build/ticket-details/ticket-parent-link";
import { useTicketDetail } from "@/features/build/ticket-details/use-ticket-detail";
import type { InboxTicketLinkTarget } from "./parse-inbox-ticket-link";
import { useCan } from "@/hooks/api/access";

const RIGHT_PANEL_COLLAPSED_KEY =
  "streamlineos:ticket-detail:right-panel:collapsed";

interface InboxTicketPreviewProps {
  target: InboxTicketLinkTarget;
  onClose?: () => void;
}

function PreviewSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-3 scrollbar-hide lg:px-5">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      <div className="hidden shrink-0 border-t border-border px-4 py-3 lg:block lg:w-72 lg:min-w-72 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:scrollbar-hide xl:w-80 xl:min-w-80">
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
  onClose,
}: {
  title: string;
  description: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mb-1 font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {onClose ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-6 h-8 gap-1.5 text-xs lg:hidden"
          onClick={onClose}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to inbox
        </Button>
      ) : null}
    </div>
  );
}

export function InboxTicketPreview({
  target,
  onClose,
}: InboxTicketPreviewProps) {
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(RIGHT_PANEL_COLLAPSED_KEY) === "true";
  });

  const handleRightPanelOpenChange = useCallback((open: boolean) => {
    const collapsed = !open;
    setRightPanelCollapsed(collapsed);
    localStorage.setItem(RIGHT_PANEL_COLLAPSED_KEY, String(collapsed));
  }, []);

  const handleExpandRightPanel = useCallback(() => {
    handleRightPanelOpenChange(true);
  }, [handleRightPanelOpenChange]);

  const { data: projectData } = useProject(target.projectId);

  const parsedTargetKey = useMemo(() => {
    if (target.ticketId != null) return null;
    if (!target.ticketKey) return null;
    return parseTicketKey(target.ticketKey);
  }, [target.ticketId, target.ticketKey]);

  const { data: byKeyTicket, isLoading: byKeyLoading } = useTicketByKey(
    target.projectId,
    parsedTargetKey?.ticketNumber ?? null,
  );

  const resolvedTicketId = useMemo(() => {
    if (target.ticketId != null) return target.ticketId;
    return byKeyTicket?.id ?? null;
  }, [target.ticketId, byKeyTicket?.id]);

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

  const handleApplyAiDescription = useCallback(
    (html: string) => {
      autoSave({ description: html });
    },
    [autoSave],
  );

  const resolving = target.ticketId == null && byKeyLoading;
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
        onClose={onClose}
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
        onClose={onClose}
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
        onClose={onClose}
      />
    );

  if (!ticket)
    return (
      <PreviewError
        title="Ticket not found"
        description="Unable to load this ticket preview."
        onClose={onClose}
      />
    );

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {onClose ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
              onClick={onClose}
              aria-label="Back to inbox"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 font-mono text-dense font-medium tabular-nums text-muted-foreground">
                {displayKey}
              </span>
              <span
                className="shrink-0 text-micro text-muted-foreground"
                aria-hidden
              >
                ·
              </span>
              <TruncatedText
                text={ticket.title}
                className="min-w-0 flex-1 text-label font-medium leading-snug text-foreground"
              />
            </div>
            {ticket.parentTicketId != null ? (
              <div className="mt-0.5 min-w-0 overflow-hidden">
                <TicketParentLink
                  parentTicketId={ticket.parentTicketId}
                  projectId={target.projectId}
                  projectKey={detailProject?.key ?? projectData?.key}
                  density="compact"
                  className="max-w-full px-0 py-0 hover:bg-transparent"
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {rightPanelCollapsed ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={handleExpandRightPanel}
              aria-label="Expand details panel"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-7 w-7 gap-0 px-0 text-xs lg:h-8 lg:w-auto lg:gap-1.5 lg:px-2.5"
          >
            <Link href={openHref} aria-label="Open ticket">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Open ticket</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto bg-gradient-to-b from-card/80 to-background/40 px-4 pb-4 pt-2 scrollbar-hide lg:px-5 lg:pb-5">
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
            onApplyDescription={handleApplyAiDescription}
            onTitleChange={handleTitleChange}
            onDescriptionChange={handleDescriptionEditorChange}
            canUpdate={canUpdate}
          />
        </div>

        <TicketDetailRightPanel
          open={!rightPanelCollapsed}
          onOpenChange={handleRightPanelOpenChange}
          displayKey={displayKey}
          saving={saving}
          ticket={ticket}
          ticketId={resolvedTicketId}
          projectId={target.projectId}
          projectKey={detailProject?.key ?? projectData?.key}
          sprints={sprints}
          statuses={statuses}
          onAutoSave={autoSave}
          asideClassName="lg:w-72 lg:min-w-72 xl:w-80 xl:min-w-80"
          canUpdate={canUpdate}
          canAssign={canAssign}
        />
      </div>
    </div>
  );
}
