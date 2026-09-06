"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InboxList } from "./inbox-list";
import { useShellVariant } from "@/components/layout/shell-variant-context";
import type { Notification } from "@/types/notifications";
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

  const handleSelect = React.useCallback((notification: Notification) => {
    setSelectionDismissed(false);
    setSelectedNotification(notification);
  }, []);

  const handleClearSelection = React.useCallback(() => {
    setSelectionDismissed(true);
    setSelectedNotification(null);
  }, []);

  const handleAutoClearSelection = React.useCallback(() => {
    setSelectedNotification(null);
  }, []);

  const handleFilterChange = React.useCallback(() => {
    setSelectionDismissed(false);
  }, []);

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
