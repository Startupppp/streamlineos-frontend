"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WifiOff } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { toast } from "sonner";
import { useProject } from "@/hooks/api/build/projects";
import { useTicketByKey } from "@/hooks/api/build/tickets";
import { useEpics } from "@/hooks/api/build/epics";
import { useModules } from "@/hooks/api/build/modules";
import { useCycles } from "@/hooks/api/build/cycles";
import {
  formatTicketKey,
  parseTicketKey,
  ticketKeyMatchesProject,
} from "@/components/shared/format-ticket-key";
import { TicketDetailMainSection } from "./ticket-detail-main-section";
import { TicketDetailRightPanel } from "./ticket-detail-right-panel";
import { TicketDetailToolbar } from "./ticket-detail-toolbar";
import { TicketConflictDialog } from "./ticket-conflict-dialog";
import { TicketParentControl } from "./ticket-parent-control";
import { useTicketDetail } from "./use-ticket-detail";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useCan, useCanState } from "@/hooks/api/access";
import { resolveTicketBackHref } from "./build-ticket-detail-url";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { formatDistanceToNow } from "date-fns";
import { TicketDetailGuards } from "./ticket-detail-guards";

interface TicketDetailPageProps {
  projectId: number;
  ticketKey: string;
}

const RIGHT_PANEL_COLLAPSED_KEY =
  "streamlineos:ticket-detail:right-panel:collapsed";

export function TicketDetailPage({
  projectId,
  ticketKey,
}: TicketDetailPageProps) {
  const isOnline = useOnlineStatus();
  const canViewAccess = useCanState("build:tickets:view");
  const canUpdate = useCan("build:tickets:update");
  const canAssign = useCan("build:tickets:assign");
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const commentParam = searchParams.get("comment");
  const highlightCommentId = commentParam ? parseInt(commentParam, 10) : null;
  const backHref = resolveTicketBackHref(projectId, searchParams.get("returnTo"));
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(
    () => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem(RIGHT_PANEL_COLLAPSED_KEY) === "true";
    },
  );
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const parsed = useMemo(() => parseTicketKey(ticketKey), [ticketKey]);
  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const {
    data: byKeyTicket,
    isLoading: byKeyLoading,
    isPending: byKeyPending,
    error: byKeyError,
    refetch: refetchByKey,
  } = useTicketByKey(projectId, parsed?.ticketNumber ?? null, INLINE_READ_ERROR);
  const resolvedProjectKey =
    projectData?.key ??
    byKeyTicket?.project?.key ?? null;
  const routeKeyMismatch =
    Boolean(parsed?.projectKey) &&
    resolvedProjectKey != null &&
    !ticketKeyMatchesProject(parsed, resolvedProjectKey);
  const ticketId = routeKeyMismatch ? null : (byKeyTicket?.id ?? null);

  const sidebarWarmProjectId = isMobile ? 0 : projectId;
  useEpics(sidebarWarmProjectId);
  useModules(sidebarWarmProjectId);
  useCycles(sidebarWarmProjectId);

  const handleDeleted = useCallback(() => { router.push(backHref); }, [router, backHref]);

  const {
    ticket,
    isLoading,
    ticketError,
    refetchTicket,
    ticketUpdatedAt,
    offlineDraftFields,
    subtasks,
    members,
    statuses,
    saving,
    conflict,
    keepConflictingEdit,
    discardConflictingEdit,
    localTitle,
    handleTitleChange,
    commitTitle,
    revertTitle,
    handleDescriptionEditorChange,
    autoSave,
    handleDelete,
    isDeleting,
  } = useTicketDetail({ projectId, ticketId, onDeleted: handleDeleted });

  const displayKey = formatTicketKey(
    projectData?.key,
    ticket?.ticketNumber ?? parsed?.ticketNumber,
  );

  const versionedTicket = useMemo(
    () =>
      ticket && typeof ticket.version === "number"
        ? { ...ticket, version: ticket.version }
        : null,
    [ticket],
  );

  const handleApplyAiDescription = useCallback(
    (html: string) => { autoSave({ description: html }); toast.success("Description updated"); },
    [autoSave],
  );

  function handleRightPanelOpenChange(open: boolean) {
    if (isMobile) { setMobilePanelOpen(open); return; }
    const collapsed = !open;
    setRightPanelCollapsed(collapsed);
    localStorage.setItem(RIGHT_PANEL_COLLAPSED_KEY, String(collapsed));
  }

  function handleExpandRightPanel() {
    handleRightPanelOpenChange(true);
  }

  const pageTitle = localTitle || (versionedTicket?.title ?? "Ticket");
  const panelOpen = isMobile ? mobilePanelOpen : !rightPanelCollapsed;
  const ready = versionedTicket && ticketId != null ? { ticket: versionedTicket, ticketId } : null;

  return (
    <TicketDetailGuards
      parsed={parsed}
      backHref={backHref}
      displayKey={displayKey}
      projectLoading={projectLoading}
      byKeyLoading={byKeyLoading}
      canViewAccess={canViewAccess}
      byKeyError={byKeyError ?? null}
      byKeyPending={byKeyPending}
      byKeyTicketExists={byKeyTicket != null}
      routeKeyMismatch={routeKeyMismatch}
      isLoading={isLoading}
      ticketError={ticketError ?? null}
      ticketExists={ticket != null}
      versionedTicketExists={versionedTicket != null}
      ticketIdExists={ticketId != null}
      refetchByKey={refetchByKey}
      refetchTicket={refetchTicket}
      onBackToIssues={() => router.push(backHref)}
    >
      <PageWrapper
        title={pageTitle}
        subtitle={
          <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="shrink-0 font-mono text-label font-normal text-muted-foreground">
              {displayKey}
            </span>
            {versionedTicket?.parentTicketId != null ? (
              <>
                <span className="shrink-0 text-muted-foreground" aria-hidden>·</span>
                <TicketParentControl
                  ticket={versionedTicket}
                  projectId={projectId}
                  projectKey={projectData?.key}
                  variant="breadcrumb"
                />
              </>
            ) : null}
          </span>
        }
        backHref={backHref}
        noInternalScroll
        actionsInline
        className="h-full"
        contentClassName="flex flex-1 min-h-0 flex-col p-0"
        actions={
          <TicketDetailToolbar
            isMobile={isMobile}
            rightPanelCollapsed={isMobile ? !mobilePanelOpen : rightPanelCollapsed}
            onExpandRightPanel={handleExpandRightPanel}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        }
      >
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-6 right-1/3 h-32 w-32 rounded-full bg-primary/[0.05] blur-3xl"
          />
          {!isOnline ? (
            <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2">
              <WifiOff className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                You&apos;re offline — edits are kept here and sent when you reconnect.
                {offlineDraftFields.length > 0 ? (
                  <span data-testid="offline-draft-count">
                    {" "}
                    {offlineDraftFields.length === 1
                      ? "1 unsent change."
                      : `${offlineDraftFields.length} unsent changes.`}
                  </span>
                ) : null}
                {ticketUpdatedAt ? (
                  <span data-testid="offline-freshness">
                    {" "}Last updated{" "}
                    {formatDistanceToNow(new Date(ticketUpdatedAt), { addSuffix: true })}.
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
          <div className="min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto bg-gradient-to-b from-card/80 to-background/40 px-4 pb-[max(8rem,calc(env(safe-area-inset-bottom)+7rem))] pt-2 scrollbar-hide max-md:pr-20 md:px-6 md:pb-5 md:pr-6">
            {ready ? (
            <TicketDetailMainSection
              ticket={ready.ticket}
              ticketId={ready.ticketId}
              projectId={projectId}
              projectKey={projectData?.key}
              localTitle={localTitle}
              subtasks={subtasks}
              members={members}
              highlightCommentId={highlightCommentId}
              onApplyDescription={handleApplyAiDescription}
              onTitleChange={handleTitleChange}
              onCommitTitle={commitTitle}
              onRevertTitle={revertTitle}
              onDescriptionChange={handleDescriptionEditorChange}
              canUpdate={canUpdate}
            />
            ) : null}
          </div>
          {ready ? (
          <TicketDetailRightPanel
            open={panelOpen}
            onOpenChange={handleRightPanelOpenChange}
            displayKey={displayKey}
            saving={saving}
            ticket={ready.ticket}
            ticketId={ready.ticketId}
            projectId={projectId}
            projectKey={projectData?.key}
            statuses={statuses}
            onAutoSave={autoSave}
            canUpdate={canUpdate}
            canAssign={canAssign}
            asideClassName="md:w-96 md:min-w-96 xl:w-[26rem] xl:min-w-[26rem]"
          />
          ) : null}
        </div>

        <TicketConflictDialog
          open={Boolean(conflict)}
          fields={conflict?.fields ?? []}
          isReapplying={saving}
          onKeepMine={keepConflictingEdit}
          onDiscard={discardConflictingEdit}
        />
      </PageWrapper>
    </TicketDetailGuards>
  );
}
