"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import {
  PmPageShell,
  PmSection,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { useInboxUrlState } from "./use-inbox-url-state";
import { useShellVariant } from "@/components/layout/shell-variant-context";
import type {
  Notification,
  NotificationSection,
  NotificationCategory,
} from "@/types/notifications";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-envelope";
import { getBuildInboxTriageSection } from "./inbox-categories";
import { NotificationCardActions } from "@/components/shared/notification-card-actions";
import { useInboxSelectedNotification, useMarkNotificationRead } from "@/hooks/api/notifications-inbox";
import { useArchiveNotification, useUnarchiveNotification, useSnoozeNotification, useUnsnoozeNotification } from "@/hooks/api/notifications-inbox-actions";
import { useNotificationInboxInvalidation, type NotificationMutationOwner } from "@/hooks/api/notifications-shared";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { LoadingState } from "@/components/shared/loading-state";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { MoveLeftIcon } from "@animateicons/react/lucide";

const InboxPreviewPane = dynamic(
  () =>
    import("./inbox-preview-pane").then((m) => ({
      default: m.InboxPreviewPane,
    })),
  { ssr: false },
);
const InboxList = dynamic(
  () => import("./inbox-list").then((m) => ({ default: m.InboxList })),
  { loading: () => null },
);
export function InboxPage() {
  const shellVariant = useShellVariant();
  const isDesktopShell = shellVariant === "desktop";
  const [selection, setSelection] = React.useState<{ id: number; section: "ALL" | "SNOOZED" | "ARCHIVED"; owner: NotificationMutationOwner } | null>(null);
  const { captureOwner } = useNotificationInboxInvalidation();
  const isOnline = useOnlineStatus();
  const read = useMarkNotificationRead(), archive = useArchiveNotification(), restore = useUnarchiveNotification();
  const snooze = useSnoozeNotification(), unsnooze = useUnsnoozeNotification();
  const [selectionDismissed, setSelectionDismissed] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const returnToListFocus = React.useRef(false);

  const urlState = useInboxUrlState();
  const currentSelection = selection?.owner.isCurrent() && captureOwner() === selection.owner ? selection : null;
  const selectedRead = useInboxSelectedNotification(currentSelection?.id ?? null, currentSelection?.section ?? "ALL");
  const previewState = usePageState({ permission: "build:view", isLoading: selectedRead.isPending, isError: !!selectedRead.error, error: selectedRead.error });
  React.useEffect(() => {
    if (selectedRead.isMissing) { setSelection(null); setSelectionDismissed(true); }
  }, [selectedRead.isMissing]);

  function handleSelect(notification: Notification) {
    const owner = captureOwner();
    if (!owner || notification.sourceModule !== "build" || notification.orgId !== owner.identity.orgId
      || (notification.userId !== null && notification.userId !== owner.identity.userId)) return;
    setSelectionDismissed(false);
    setSelection({ id: notification.id, section: getBuildInboxTriageSection(urlState.section), owner });
  }

  function handleClearSelection() {
    returnToListFocus.current = true;
    setSelectionDismissed(true);
    setSelection(null);
  }

  function handleFilterChange() {
    setSelection(null);
    setSelectionDismissed(false);
  }

  function handleSectionChange(next: NotificationSection) {
    if (next === urlState.section) return;
    urlState.setParams({ section: next === "UNREAD" ? null : next });
    handleFilterChange();
  }

  function handleQChange(raw: string) {
    if ((raw || null) === urlState.q) return;
    urlState.setParams({ q: raw || null });
    handleFilterChange();
  }

  function handleTypeChange(value: NotificationCategory | null) {
    if (value === urlState.type) return;
    urlState.setParams({ type: value });
    handleFilterChange();
  }

  function handleProjectClear() {
    urlState.setParams({ projectId: null });
    handleFilterChange();
  }

  function handleClearFilters() {
    urlState.clearFilters();
    handleFilterChange();
  }

  async function runTriage(id: number, command: () => Promise<unknown>) {
    const owner = captureOwner();
    if (!owner || !isOnline) throw new ApiError("Reconnect to update your inbox.", undefined, "ABORTED");
    await command();
    if (owner.isCurrent()) setSelection((previous) => previous?.id === id && previous.owner === owner ? null : previous);
    if (owner.isCurrent()) setSelectionDismissed(true);
  }
  function renderActions(notification: Notification) {
    async function handleRead() { await read.mutateAsync(notification.id); }
    function handleResolve() { return runTriage(notification.id, () => archive.mutateAsync(notification.id)); }
    function handleRestore() { return runTriage(notification.id, () => restore.mutateAsync(notification.id)); }
    function handleSnooze(until: string) { return runTriage(notification.id, () => snooze.mutateAsync({ notificationId: notification.id, snoozedUntil: until })); }
    function handleUnsnooze() { return runTriage(notification.id, () => unsnooze.mutateAsync(notification.id)); }
    return <NotificationCardActions key={notification.id} pinned={notification.pinned} isArchived={notification.archivedAt !== null}
      triage={{ isRead: notification.isRead, isSnoozed: notification.snoozedUntil !== null, disabled: !isOnline,
        onRead: handleRead, onResolve: handleResolve, onRestore: handleRestore, onSnooze: handleSnooze, onUnsnooze: handleUnsnooze }} />;
  }
  const hasSelection = currentSelection != null;
  React.useLayoutEffect(() => {
    if (!hasSelection && returnToListFocus.current) {
      returnToListFocus.current = false;
      searchInputRef.current?.focus();
    }
  }, [hasSelection]);

  const listPane = (
    <InboxList
      selectedId={currentSelection?.id ?? null}
      section={urlState.section}
      q={urlState.q}
      type={urlState.type}
      projectId={urlState.projectId}
      cursor={urlState.cursor}
      selectionDismissed={selectionDismissed}
      onSelect={handleSelect}
      onClearSelection={handleClearSelection}
      onSectionChange={handleSectionChange}
      onQChange={handleQChange}
      onTypeChange={handleTypeChange}
      onProjectClear={handleProjectClear}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      searchInputRef={searchInputRef}
      hasActiveFilters={urlState.hasActiveFilters}
      renderActions={renderActions}
    />
  );

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Mentions, assignments and approvals"
      noInternalScroll
    >
      <PmPageShell>
        <PmSection
          index={0}
          className={cn(PM_FILL_SECTION, CONTENT_PANEL_SOLID)}
        >
          <div className="flex h-full min-h-0 min-w-0 divide-x divide-border">
            <div
              className={cn(
                "min-h-0 min-w-0 flex-col overflow-hidden lg:shrink-0",
                hasSelection
                  ? "hidden lg:flex lg:w-[280px] xl:w-[320px]"
                  : "flex w-full lg:w-[320px] xl:w-[360px]",
              )}
            >
              {listPane}
            </div>

            {isDesktopShell || hasSelection ? (
              <div
                className={cn(
                  "min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden",
                  hasSelection ? "flex" : "hidden lg:flex",
                )}
              >
                {hasSelection && !selectedRead.notification ? <div className="flex shrink-0 border-b border-border px-3 py-2 lg:hidden">
                  <AnimatedIconButton type="button" variant="ghost" size="icon" icon={MoveLeftIcon} iconSize={16} aria-label="Back to inbox" onClick={handleClearSelection} />
                </div> : null}
                {selectedRead.notification ? <div className="flex shrink-0 items-center justify-end border-b border-border px-3 py-2" aria-label="Selected notification actions">{renderActions(selectedRead.notification)}</div> : null}
                <PageState resolution={previewState} loading={<LoadingState variant="list" rows={3} />} onRetry={selectedRead.retry}>
                  <InboxPreviewPane notification={selectedRead.notification} onClose={handleClearSelection} />
                </PageState>
              </div>
            ) : (
              <div
                className="hidden lg:flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden"
                aria-hidden
              />
            )}
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
