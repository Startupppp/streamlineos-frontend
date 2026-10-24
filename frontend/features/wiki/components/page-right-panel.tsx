"use client";

import { useState } from "react";
import { KbFileTextIcon } from "@/features/wiki/lib/kb-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageState } from "@/components/shared/page-state";
import { ErrorReference } from "@/components/shared/error-reference";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCanState } from "@/hooks/api/access";
import { isApiError } from "@/lib/api-envelope";
import { RecordConversationPanel } from "@/features/chat/record-conversation-page";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useKbPageBacklinks } from "@/hooks/api/kb/pages";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useKbPageActivity } from "@/hooks/api/kb/activity";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { kbTimeAgo, kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import {
  KB_STATUS_LABELS,
  KB_STATUS_BADGE_CLASS,
} from "@/features/wiki/lib/kb-page-status";
import { PageActivityGraph } from "./page-activity-graph";
import { TrustBadge } from "./kb-collection-badges";
import { PageFlagBadges } from "./page-flag-badges";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { cn } from "@/lib/utils";

const RECORD_LINK_DISPLAY_LIMIT = 20;

const VISIBILITY_LABELS: Record<string, string> = {
  private: "Private",
  org: "Team",
  public: "Public",
};

interface PageRightPanelProps {
  pageId: number;
  page: KbPageDetail;
  wordCount?: number;
  onNavigate: (pageId: number) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

interface PanelContentProps {
  pageId: number;
  page: KbPageDetail;
  wordCount?: number;
  onNavigate: (pageId: number) => void;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-1.5 text-micro", KB_STATUS_BADGE_CLASS[status])}
    >
      {KB_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function PropertyRow({
  label,
  children,
  suppressHydrationWarning,
}: {
  label: string;
  children: React.ReactNode;
  suppressHydrationWarning?: boolean;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-0.5 py-1.5">
      <dt className="pt-0.5 text-micro font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className="min-w-0 text-sm text-foreground"
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {children}
      </dd>
    </div>
  );
}

function SectionHeading({
  title,
  count,
}: {
  title: string;
  count?: string | number;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="text-micro font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      {count === undefined ? null : (
        <span className="text-micro tabular-nums text-muted-foreground/80">
          {count}
        </span>
      )}
    </div>
  );
}

function PersonValue({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar className="h-5 w-5 shrink-0">
        <AvatarFallback className="bg-muted text-micro font-medium text-muted-foreground">
          {getUserInitials({ name })}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name}</span>
    </span>
  );
}

function PanelContent({
  pageId,
  page,
  wordCount,
  onNavigate,
}: PanelContentProps) {
  const {
    data: backlinks = [],
    isLoading: backlinksLoading,
    isError: backlinksError,
    error: backlinksReadError,
    refetch: refetchBacklinks,
    hasNextPage: hasMoreBacklinks,
    fetchNextPage: loadMoreBacklinks,
    isFetchingNextPage: backlinksLoadingMore,
  } = useKbPageBacklinks(pageId);
  const { data: recordLinks = [], hasNextPage: hasMoreRecordLinks } =
    useKbPageRecordLinks(pageId);
  const {
    data: activityEntries = [],
    isLoading: activityLoading,
    isError: activityError,
  } = useKbPageActivity(pageId);

  const backlinksAccessLost =
    isApiError(backlinksReadError) &&
    (backlinksReadError.status === 401 ||
      backlinksReadError.status === 403 ||
      backlinksReadError.status === 404);
  const backlinksState = usePageState({
    permission: "kb:pages:view",
    isLoading: backlinksLoading,
    isError: backlinksError && (backlinks.length === 0 || backlinksAccessLost),
    error: backlinksReadError,
    isEmpty: !backlinksLoading && !backlinksError && backlinks.length === 0,
  });
  const memberIds = [page.lastEditedById, page.ownerUserId].filter(
    (id): id is string => id !== null && id !== undefined,
  );
  const { data: membersPage, isLoading: membersLoading } =
    useOrgMembersByIds(memberIds);
  const members = membersPage?.data ?? [];

  function handleBacklinkClick(event: React.MouseEvent<HTMLButtonElement>) {
    const id = Number(event.currentTarget.dataset.pageId);
    if (!Number.isFinite(id)) return;
    onNavigate(id);
  }

  function handleRetryBacklinks() {
    void refetchBacklinks();
  }

  function memberName(userId: string | null | undefined): string | null {
    if (!userId) return null;
    const member = members.find((m) => m.userId === userId);
    return member
      ? getUserDisplayName({ name: member.name, email: member.email })
      : null;
  }

  const editorName = memberName(page.lastEditedById);
  const ownerName = memberName(page.ownerUserId);
  const editedValue = page.lastEditedById
    ? `${kbTimeAgo(page.updatedAt)} · ${editorName ?? "Member unavailable"}`
    : kbTimeAgo(page.updatedAt);
  const ownerValue = page.ownerUserId
    ? (ownerName ?? "Member unavailable")
    : "Unassigned";
  const visibilityValue =
    VISIBILITY_LABELS[page.visibility] ?? page.visibility ?? "Private";
  const reviewValue = page.nextReviewAt
    ? kbFormatDate(page.nextReviewAt)
    : "Not scheduled";

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <section aria-label="Page properties">
        <dl className="divide-y divide-border/60">
          <PropertyRow label="Status">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={page.status} />
              {page.trustState ? (
                <TrustBadge trustState={page.trustState} />
              ) : null}
              <PageFlagBadges
                isLocked={page.isLocked}
                isFavorite={page.isFavorite}
              />
            </div>
          </PropertyRow>
          <PropertyRow label="Visibility">{visibilityValue}</PropertyRow>
          {wordCount === undefined ? null : (
            <PropertyRow label="Words">
              <span className="tabular-nums">{wordCount.toLocaleString()}</span>
            </PropertyRow>
          )}
          <PropertyRow label="Created" suppressHydrationWarning>
            <span className="tabular-nums">{kbTimeAgo(page.createdAt)}</span>
          </PropertyRow>
          <PropertyRow label="Edited" suppressHydrationWarning>
            {membersLoading && page.lastEditedById !== null ? (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                {kbTimeAgo(page.updatedAt)}
                <Skeleton className="inline-block h-3.5 w-20" />
              </span>
            ) : (
              <span className="tabular-nums">{editedValue}</span>
            )}
          </PropertyRow>
          <PropertyRow label="Owner">
            {membersLoading && page.ownerUserId !== null ? (
              <Skeleton className="h-4 w-24" />
            ) : ownerValue === "Unassigned" ||
              ownerValue === "Member unavailable" ? (
              <span className="text-muted-foreground">{ownerValue}</span>
            ) : (
              <PersonValue name={ownerValue} />
            )}
          </PropertyRow>
          <PropertyRow label="Next review" suppressHydrationWarning>
            <span
              className={cn(
                "tabular-nums",
                page.nextReviewAt ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {reviewValue}
            </span>
          </PropertyRow>
        </dl>
      </section>

      <section>
        <SectionHeading
          title="Backlinks"
          count={
            backlinksState.kind === "ready" || backlinksState.kind === "empty"
              ? `${backlinks.length}${hasMoreBacklinks ? "+" : ""}`
              : undefined
          }
        />
        <PageState
          resolution={backlinksState}
          compact
          onRetry={handleRetryBacklinks}
          loading={<Skeleton className="h-12 w-full rounded-md" />}
          empty={
            <p className="text-xs text-muted-foreground">No files link here.</p>
          }
        >
          <>
            <ul className="flex flex-col gap-0.5">
              {backlinks.map((bl) => (
                <li key={bl.id}>
                  <button
                    type="button"
                    data-page-id={bl.id}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    onClick={handleBacklinkClick}
                  >
                    <span className="shrink-0 text-sm leading-none">
                      {bl.icon ?? (
                        <KbFileTextIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </span>
                    <TruncatedText text={bl.title || "Untitled"} />
                  </button>
                </li>
              ))}
            </ul>
            <InfiniteScrollSentinel
              hasNextPage={hasMoreBacklinks ?? false}
              isFetchingNextPage={backlinksLoadingMore}
              onLoadMore={loadMoreBacklinks}
              label="Load more backlinks"
            />
            {backlinksError && (
              <div
                role="alert"
                className="mt-2 space-y-2 text-xs text-destructive"
              >
                <p>Could not refresh backlinks.</p>
                <ErrorReference error={backlinksReadError} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetryBacklinks}
                >
                  Retry backlinks
                </Button>
              </div>
            )}
          </>
        </PageState>
      </section>

      <section>
        <SectionHeading
          title="Linked records"
          count={`${recordLinks.length}${hasMoreRecordLinks ? "+" : ""}`}
        />
        {recordLinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No linked records.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-0.5">
              {recordLinks.slice(0, RECORD_LINK_DISPLAY_LIMIT).map((rl) => (
                <li
                  key={rl.id}
                  className="rounded-md px-1.5 py-1.5 text-sm text-foreground"
                >
                  <TruncatedText
                    text={rl.label ?? rl.targetType}
                    className="capitalize"
                  />
                </li>
              ))}
            </ul>
            {recordLinks.length > RECORD_LINK_DISPLAY_LIMIT ? (
              <p className="mt-1 px-1.5 text-xs text-muted-foreground">
                +{recordLinks.length - RECORD_LINK_DISPLAY_LIMIT}
                {hasMoreRecordLinks ? "+" : ""} more
              </p>
            ) : null}
          </>
        )}
      </section>

      <section>
        <SectionHeading title="Activity" />
        {activityLoading ? (
          <Skeleton className="h-16 w-full rounded-md" />
        ) : activityError ? (
          <p className="text-xs text-destructive">Could not load activity.</p>
        ) : activityEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent activity.</p>
        ) : (
          <PageActivityGraph entries={activityEntries} />
        )}
      </section>
    </div>
  );
}

export default function PageRightPanel({
  pageId,
  page,
  wordCount,
  onNavigate,
  mobileOpen,
  onMobileOpenChange,
}: PageRightPanelProps) {
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] = useState(false);
  const title = page.title || "Untitled";
  const isMobileControlled = onMobileOpenChange !== undefined;
  const mobileSheetOpen = isMobileControlled
    ? Boolean(mobileOpen)
    : uncontrolledMobileOpen;
  const chatAccess = useCanState("chat:channels:read");

  function handleMobileSheetChange(open: boolean) {
    if (isMobileControlled) onMobileOpenChange?.(open);
    else setUncontrolledMobileOpen(open);
  }

  return (
    <Sheet open={mobileSheetOpen} onOpenChange={handleMobileSheetChange}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border px-4 py-3 pr-12">
          <SheetDescription className="text-xs">Page details</SheetDescription>
          <SheetTitle className="truncate text-base leading-tight">
            {title}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col p-0">
          {chatAccess !== "denied" ? (
            <Tabs defaultValue="details" className="flex flex-col flex-1 min-h-0">
              <TabsList className="shrink-0 mx-4 mt-3 mb-0 self-start">
                <TabsTrigger value="details" className="text-xs px-3">Details</TabsTrigger>
                <TabsTrigger value="chat" className="text-xs px-3">Chat</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="flex-1 overflow-y-auto">
                <PanelContent
                  pageId={pageId}
                  page={page}
                  wordCount={wordCount}
                  onNavigate={onNavigate}
                />
              </TabsContent>
              <TabsContent value="chat" className="flex flex-col flex-1 min-h-[400px]">
                <RecordConversationPanel
                  entityType="doc_page"
                  entityId={String(pageId)}
                  emptyDescriptionWrite="This document does not have an associated chat channel yet. Create one to start the conversation."
                  emptyDescriptionReadOnly="This document does not have an associated chat channel yet. Ask an admin to link one."
                />
              </TabsContent>
            </Tabs>
          ) : (
            <PanelContent
              pageId={pageId}
              page={page}
              wordCount={wordCount}
              onNavigate={onNavigate}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
