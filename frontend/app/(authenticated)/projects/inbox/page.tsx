"use client";

import * as React from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InboxList } from "@/features/projects/inbox/inbox-list";
import { InboxPreviewPane } from "@/features/projects/inbox/inbox-preview-pane";
import type { Notification } from "@/types/notifications";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const [selectedNotification, setSelectedNotification] =
    React.useState<Notification | null>(null);

  function handleSelect(notification: Notification) {
    setSelectedNotification(notification);
  }

  function handleClearSelection() {
    setSelectedNotification(null);
  }

  const hasSelection = selectedNotification != null;

  return (
    <PageWrapper
      title="Inbox"
      subtitle="Mentions, assignments, and updates addressed to you"
      noInternalScroll
      contentClassName="p-0"
    >
      <div className="flex h-full min-h-0 min-w-0 divide-x divide-border">
        <div
          className={cn(
            "flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden",
            hasSelection
              ? "hidden lg:flex lg:w-[280px] xl:w-[320px]"
              : "w-full sm:w-[320px] xl:w-[360px]",
          )}
        >
          <InboxList
            selectedId={selectedNotification?.id ?? null}
            onSelect={handleSelect}
          />
        </div>

        <div
          className={cn(
            "min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden",
            hasSelection ? "flex" : "hidden sm:flex",
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
