"use client";

import { FileText, MessageSquare, Paperclip } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { PmPanel, PmSection, PM_ROW } from "@/components/pm-chrome";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type {
  PortalFile,
  PortalRequest,
  PortalUpdate,
} from "@/features/portal/lib/portal-child-pages";
import {
  CR_STATUS_LABELS,
  CR_STATUS_STYLES,
  DownloadLink,
  SectionTitle,
} from "./portal-dashboard-sections";

export interface ChildPageView<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

function RowsSkeleton() {
  return (
    <PmPanel className="space-y-2 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </PmPanel>
  );
}

export function PreviewFilesSection({
  index,
  page,
}: {
  index: number;
  page: ChildPageView<PortalFile>;
}) {
  return (
    <PmSection index={index}>
      <SectionTitle icon={Paperclip} title="Files" />
      {page.isLoading ? (
        <RowsSkeleton />
      ) : page.items.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustrationPreset="documents"
            title="No files"
            description="No files have been shared yet."
            compact
            className="min-h-[100px]"
          />
        </PmPanel>
      ) : (
        <PmPanel>
          {page.items.map((file) => (
            <div key={file.id} className={cn(PM_ROW, "overflow-hidden")}>
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <TruncatedText text={file.filename} className="min-w-0 flex-1 text-dense" />
              <DownloadLink href={file.url} />
            </div>
          ))}
          <InfiniteScrollSentinel
            hasNextPage={page.hasMore}
            isFetchingNextPage={page.isFetchingNextPage}
            onLoadMore={page.onLoadMore}
            label="Load more files"
          />
        </PmPanel>
      )}
    </PmSection>
  );
}

export function PreviewUpdatesSection({
  index,
  page,
}: {
  index: number;
  page: ChildPageView<PortalUpdate>;
}) {
  return (
    <PmSection index={index}>
      <SectionTitle icon={MessageSquare} title="Updates" />
      {page.isLoading ? (
        <RowsSkeleton />
      ) : page.items.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustrationPreset="default"
            title="No updates"
            description="Updates shared with the client will appear here."
            compact
            className="min-h-[100px]"
          />
        </PmPanel>
      ) : (
        <PmPanel>
          {page.items.map((update) => (
            <div key={update.id} className={cn(PM_ROW, "overflow-hidden")}>
              <span className="w-28 shrink-0 truncate text-micro text-muted-foreground">
                {update.authorName}
              </span>
              <TruncatedText text={update.body} className="min-w-0 flex-1 text-dense" />
            </div>
          ))}
          <InfiniteScrollSentinel
            hasNextPage={page.hasMore}
            isFetchingNextPage={page.isFetchingNextPage}
            onLoadMore={page.onLoadMore}
            label="Load more updates"
          />
        </PmPanel>
      )}
    </PmSection>
  );
}

export function PreviewRequestsSection({
  index,
  page,
  canSubmit,
  onSubmitRequest,
}: {
  index: number;
  page: ChildPageView<PortalRequest>;
  canSubmit: boolean;
  onSubmitRequest: () => void;
}) {
  return (
    <PmSection index={index}>
      <SectionTitle
        icon={FileText}
        title="Change Requests"
        actions={
          canSubmit ? (
            <AnimatedIconButton
              size="sm"
              className="text-dense"
              onClick={onSubmitRequest}
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-1"
            >
              Submit Request
            </AnimatedIconButton>
          ) : undefined
        }
      />
      {page.isLoading ? (
        <RowsSkeleton />
      ) : page.items.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustrationPreset="ticket"
            title="No change requests"
            description="Submit a change request if the project scope needs adjustment."
            {...(canSubmit ? { action: { label: "Submit Request", onClick: onSubmitRequest } } : {})}
            compact
            className="min-h-[100px]"
          />
        </PmPanel>
      ) : (
        <PmPanel>
          {page.items.map((request) => (
            <div key={request.id} className={cn(PM_ROW, "overflow-hidden")}>
              <TruncatedText text={request.title} className="min-w-0 flex-1 text-dense" />
              <Badge
                variant="outline"
                className={cn("shrink-0 text-micro", CR_STATUS_STYLES[request.status])}
              >
                {CR_STATUS_LABELS[request.status] ?? request.status}
              </Badge>
            </div>
          ))}
          <InfiniteScrollSentinel
            hasNextPage={page.hasMore}
            isFetchingNextPage={page.isFetchingNextPage}
            onLoadMore={page.onLoadMore}
            label="Load more change requests"
          />
        </PmPanel>
      )}
    </PmSection>
  );
}
