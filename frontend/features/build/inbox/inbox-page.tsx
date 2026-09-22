"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InboxList } from "./inbox-list";
import { InboxDraftsPanel } from "./inbox-drafts-panel";
import { useInboxUrlState } from "./use-inbox-url-state";
import { useShellVariant } from "@/components/layout/shell-variant-context";
import type { Notification, NotificationSection, NotificationCategory } from "@/types/notifications";
import { cn } from "@/lib/utils";

const InboxPreviewPane = dynamic(
  () => import("./inbox-preview-pane").then((m) => ({ default: m.InboxPreviewPane })),
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
      selectionDismissed={selectionDismissed}
      onSelect={handleSelect}
      onClearSelection={handleAutoClearSelection}
      onSectionChange={handleSectionChange}
      onQChange={handleQChange}
      onTypeChange={handleTypeChange}
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
      contentClassName="!p-0 mx-4 mb-2 sm:mx-6 lg:mx-8 rounded-xl border border-border"
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

        {(isDesktopShell || hasSelection) ? (
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
          <div className="hidden lg:flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden" aria-hidden />
        )}
      </div>
    </PageWrapper>
  );
}
