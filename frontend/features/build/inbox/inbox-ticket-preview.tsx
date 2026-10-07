"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewSkeleton, PreviewError } from "./inbox-ticket-preview-states";
import { isApiError, getApiErrorCode } from "@/lib/api-client";
import { useProject } from "@/hooks/api/build/projects";
import { useTicketByKey } from "@/hooks/api/build/tickets";
import {
  formatTicketKey,
  parseTicketKey,
} from "@/components/shared/format-ticket-key";
import { TicketDetailMainSection } from "@/features/build/ticket-details/ticket-detail-main-section";
import { TicketDetailRightPanel } from "@/features/build/ticket-details/ticket-detail-right-panel";
import { useTicketDetail } from "@/features/build/ticket-details/use-ticket-detail";
import type { InboxTicketLinkTarget } from "./parse-inbox-ticket-link";
import { useCan } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";

const RIGHT_PANEL_COLLAPSED_KEY =
  "streamlineos:inbox-ticket-preview:right-panel:collapsed";

interface InboxTicketPreviewProps {
  target: InboxTicketLinkTarget;
  onClose?: () => void;
}

export function InboxTicketPreview({
  target,
  onClose,
}: InboxTicketPreviewProps) {
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem(RIGHT_PANEL_COLLAPSED_KEY) === "true";
    },
  );

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

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [resolvedTicketId]);

  const {
    ticket,
    saving,
    members,
    subtasks,
    statuses,
    autoSave,
    localTitle,
    ticketError,
    refetchTicket,
    handleTitleChange,
    commitTitle,
    revertTitle,
    isLoading: ticketLoading,
    projectData: detailProject,
    handleDescriptionEditorChange,
  } = useTicketDetail({
    projectId: target.projectId,
    ticketId: resolvedTicketId,
  });

  const versionedTicket = useMemo(
    () =>
      ticket && typeof ticket.version === "number"
        ? { ...ticket, version: ticket.version }
        : null,
    [ticket],
  );

  const handleApplyAiDescription = useCallback(
    (html: string) => {
      autoSave({ description: html });
    },
    [autoSave],
  );

  const resolving = target.ticketId == null && byKeyLoading;
  const isLoading = resolving || (resolvedTicketId != null && ticketLoading);
  const loadingState = usePageState({
    permission: "build:view",
    isLoading,
    isError: false,
  });
  const displayKey = formatTicketKey(
    detailProject?.key ?? projectData?.key,
    ticket?.ticketNumber,
  );

  if (isLoading) {
    return (
      <PageState
        resolution={loadingState}
        loading={<PreviewSkeleton />}
        className="h-full min-h-0"
      >
        <div />
      </PageState>
    );
  }

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

  if (ticketError)
    return (
      <PreviewError
        title="Unable to load ticket"
        description="Something went wrong while loading this ticket preview."
        onClose={onClose}
        onRetry={() => {
          void refetchTicket();
        }}
      />
    );

  if (!ticket || !versionedTicket)
    return (
      <PreviewError
        title="Ticket not found"
        description="Unable to load this ticket preview."
        onClose={onClose}
      />
    );

  return (
    <div className="relative flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden">
      {rightPanelCollapsed ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute right-2 top-2 z-20 h-8 w-8 bg-card/90 text-muted-foreground shadow-sm"
          onClick={handleExpandRightPanel}
          aria-label="Expand details panel"
        >
          <PanelRightOpen className="h-3.5 w-3.5" />
        </Button>
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
        {rightPanelCollapsed ? (
        <div ref={mainScrollRef} className="flex min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto bg-gradient-to-b from-card/80 to-background/40 px-4 pb-4 pt-10 scrollbar-hide max-md:pr-20 md:px-6 md:pb-5 md:pr-6">
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
            onCommitTitle={commitTitle}
            onRevertTitle={revertTitle}
            onDescriptionChange={handleDescriptionEditorChange}
            canUpdate={canUpdate}
          />
        </div>
        ) : null}

        <TicketDetailRightPanel
          open={!rightPanelCollapsed}
          onOpenChange={handleRightPanelOpenChange}
          displayKey={displayKey}
          saving={saving}
          ticket={versionedTicket}
          ticketId={resolvedTicketId}
          projectId={target.projectId}
          projectKey={detailProject?.key ?? projectData?.key}
          statuses={statuses}
          onAutoSave={autoSave}
          asideClassName={rightPanelCollapsed ? "lg:w-72 lg:min-w-72 xl:w-80 xl:min-w-80" : "flex-1 min-w-0"}
          canUpdate={canUpdate}
          canAssign={canAssign}
        />
      </div>
    </div>
  );
}
