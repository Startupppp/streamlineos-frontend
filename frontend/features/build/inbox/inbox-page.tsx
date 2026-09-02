"use client";

import * as React from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InboxList } from "./inbox-list";
import { InboxPreviewPane } from "./inbox-preview-pane";
import type { Notification } from "@/types/notifications";
import { cn } from "@/lib/utils";

export function InboxPage() {
  const [selectedNotification, setSelectedNotification] =
    React.useState<Notification | null>(null);
  const [selectionDismissed, setSelectionDismissed] = React.useState(false);

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

  const hasSelection = selectedNotification != null;

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Mentions, assignments, and updates addressed to you"
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
          <InboxList
            selectedId={selectedNotification?.id ?? null}
            selectionDismissed={selectionDismissed}
            onSelect={handleSelect}
            onClearSelection={handleAutoClearSelection}
            onFilterChange={handleFilterChange}
          />
        </div>

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
      </div>
    </PageWrapper>
  );
}
