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
const InboxDraftsPanel = dynamic(
  () =>
    import("./inbox-drafts-panel").then((m) => ({
      default: m.InboxDraftsPanel,
    })),
  { ssr: false },
);

export function InboxPage() {
  const shellVariant = useShellVariant();
  const isDesktopShell = shellVariant === "desktop";
  const [selectedNotification, setSelectedNotification] =
    React.useState<Notification | null>(null);
  const [selectionDismissed, setSelectionDismissed] = React.useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const urlState = useInboxUrlState();
  const isDraftsView = urlState.view === "drafts";

  function handleSelect(notification: Notification) {
    setSelectionDismissed(false);
    setSelectedNotification(notification);
  }

  function handleClearSelection() {
    setSelectionDismissed(true);
    setSelectedNotification(null);
  }

  function handleAutoClearSelection() {
    setSelectedNotification(null);
  }

  function handleFilterChange() {
    setSelectionDismissed(false);
  }

  function handleSectionChange(next: NotificationSection) {
    urlState.setParams({ section: next === "UNREAD" ? null : next });
    handleFilterChange();
  }

  function handleQChange(raw: string) {
    urlState.setParams({ q: raw || null });
    handleFilterChange();
  }

  function handleTypeChange(value: NotificationCategory | null) {
    urlState.setParams({ type: value });
    handleFilterChange();
  }

  function handleProjectClear() {
    urlState.setParams({ project: null });
    handleFilterChange();
  }

  function handleClearFilters() {
    urlState.clearFilters();
    handleFilterChange();
  }

  const hasSelection = selectedNotification != null;

  const listPane = isDraftsView ? (
    <InboxDraftsPanel />
  ) : (
    <InboxList
      selectedId={selectedNotification?.id ?? null}
      section={urlState.section}
      q={urlState.q}
      type={urlState.type}
      projectId={urlState.projectId}
      selectionDismissed={selectionDismissed}
      onSelect={handleSelect}
      onClearSelection={handleAutoClearSelection}
      onSectionChange={handleSectionChange}
      onQChange={handleQChange}
      onTypeChange={handleTypeChange}
      onProjectClear={handleProjectClear}
      onFilterChange={handleFilterChange}
      onClearFilters={handleClearFilters}
      searchInputRef={searchInputRef}
      hasActiveFilters={urlState.hasActiveFilters}
    />
  );

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Mentions, assignments, approvals and drafts"
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
                <InboxPreviewPane
                  notification={selectedNotification}
                  onClose={handleClearSelection}
                />
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
