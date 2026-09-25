"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import {
  useContentHealthCounts,
  useContentHealthSignals,
} from "@/hooks/api/kb/content-health";
import type { ContentHealthSignalType } from "@/hooks/api/kb/content-health-schema";
import { pageHref } from "@/lib/knowledge-routes";
import {
  KbFileTextIcon,
  KbAlertCircleIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import {
  ContentHealthDismissDialog,
  useDismissDialog,
} from "@/features/wiki/components/content-health-dismiss-dialog";

const SIGNAL_TYPES: ContentHealthSignalType[] = [
  "unowned",
  "stale",
  "unverified",
  "empty",
  "overdue_review",
  "broken_link",
  "overexposed",
  "duplicate_candidate",
  "contradictory_claim",
];

const SIGNAL_LABELS: Record<ContentHealthSignalType, string> = {
  unowned: "Unowned",
  stale: "Stale",
  unverified: "Unverified",
  empty: "Empty",
  overdue_review: "Overdue review",
  broken_link: "Broken link",
  overexposed: "Overexposed",
  duplicate_candidate: "Duplicate candidate",
  contradictory_claim: "Contradictory claim",
};

const SIGNAL_DESCRIPTIONS: Record<ContentHealthSignalType, string> = {
  unowned: "Pages with no assigned owner",
  stale: "Pages not updated in 90 or more days",
  unverified: "Pages in an unverified or expired trust state",
  empty: "Pages with no content body",
  overdue_review: "Pages with a pending review that is past its due date",
  broken_link: "Pages that contain links to deleted or missing pages",
  overexposed: "Pages marked public while their space is not a public help centre",
  duplicate_candidate: "Pages whose content is identical to another page in this org",
  contradictory_claim: "Pages flagged as containing claims that contradict other pages",
};

interface CountChipProps {
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}

function CountChip({ label, count, active, onSelect }: CountChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
      }`}
    >
      <span className="text-lg font-semibold tabular-nums text-foreground">
        {count}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}

function SignalRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-16 ml-auto shrink-0" />
    </div>
  );
}

function ContentHealthSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
        {Array.from({ length: 8 }).map((_, i) => (
          <SignalRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function ContentHealthPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });
  const cursorState = useCursorPagination();
  const { state: dismissState, openDismiss, closeDialog } = useDismissDialog();

  const activeSignal = parseEnum<readonly ContentHealthSignalType[]>(
    searchParams.get("signal"),
    SIGNAL_TYPES,
    "unowned",
  );

  const rawAfter = cursorState.cursor
    ? parseInt(cursorState.cursor, 10)
    : undefined;
  const afterId =
    rawAfter !== undefined && Number.isFinite(rawAfter) ? rawAfter : undefined;

  const {
    data: countsData,
    isLoading: countsLoading,
    isError: countsError,
    error: countsQueryError,
    refetch: refetchCounts,
  } = useContentHealthCounts();

  const {
    data: signalsData,
    isLoading: signalsLoading,
    isError: signalsError,
    refetch: refetchSignals,
  } = useContentHealthSignals({ signalType: activeSignal, afterId });

  function handleSignalSelect(signal: string) {
    cursorState.reset();
    updateFilters({ signal });
  }

  function handleRetry() {
    void refetchCounts();
    void refetchSignals();
  }

  function handleNext() {
    const next = signalsData?.nextCursor;
    if (next != null) cursorState.goNext(String(next));
  }

  function handlePrevious() {
    cursorState.goPrevious();
  }

  function handleDismissOpenChange(open: boolean) {
    if (!open) closeDialog();
  }

  const rows = signalsData?.data ?? [];
  const hasMore = signalsData?.hasMore ?? false;
  const isLoading = countsLoading || signalsLoading;
  const isError = countsError || signalsError;
  const allZero =
    !isLoading &&
    !isError &&
    (countsData?.counts.every((c) => c.count === 0) ?? false);

  const pageState = usePageState({
    permission: "kb:pages:manage",
    isLoading,
    isError,
    error: countsQueryError,
    isEmpty: allZero,
  });

  const countMap = new Map(
    (countsData?.counts ?? []).map((c) => [c.signalType, c.count]),
  );

  return (
    <PageWrapper title="Content Health">
      <PageState
        resolution={pageState}
        className="flex-1"
        onRetry={handleRetry}
        loading={<ContentHealthSkeleton />}
        empty={
          <EmptyState
            illustration={
              <KbFileTextIcon className="h-8 w-8 text-muted-foreground" />
            }
            title="No content health issues"
            description="All pages pass every signal check."
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SIGNAL_TYPES.map((signal) => (
              <CountChip
                key={signal}
                label={SIGNAL_LABELS[signal]}
                count={countMap.get(signal) ?? 0}
                active={activeSignal === signal}
                onSelect={() => handleSignalSelect(signal)}
              />
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card/60 px-4 py-3 flex items-start gap-2">
            <KbAlertCircleIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Searches that returned no results are a separate signal tracked at{" "}
              <Link
                href="/support/knowledge-gaps"
                className="underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Knowledge Gaps
              </Link>
              .
            </p>
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {SIGNAL_LABELS[activeSignal]}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {SIGNAL_DESCRIPTIONS[activeSignal]}
                </p>
              </div>
              <Select value={activeSignal} onValueChange={handleSignalSelect}>
                <SelectTrigger
                  className="w-44 h-8 text-xs"
                  aria-label="Signal type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIGNAL_TYPES.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {SIGNAL_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {signalsLoading ? (
              <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SignalRowSkeleton key={i} />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                illustration={
                  <KbFileTextIcon className="h-6 w-6 text-muted-foreground" />
                }
                title={`No ${SIGNAL_LABELS[activeSignal].toLowerCase()} pages`}
                description="No pages match this signal."
                compact
              />
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                  <div className="flex items-center gap-3 px-3 py-2 border-b border-border">
                    <span className="flex-1 text-xs font-medium text-muted-foreground">
                      Title
                    </span>
                    <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                      Impact
                    </span>
                    <span className="text-xs font-medium text-muted-foreground w-24 text-right">
                      Updated
                    </span>
                    <span className="w-16" />
                  </div>
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <Link
                        href={pageHref(row.id)}
                        className="flex-1 text-sm truncate hover:underline text-foreground"
                      >
                        {row.title || "Untitled"}
                      </Link>
                      <span className="text-xs text-muted-foreground w-12 text-right tabular-nums font-mono shrink-0">
                        {row.impact}
                      </span>
                      <span className="text-xs text-muted-foreground w-24 text-right tabular-nums shrink-0">
                        {kbFormatDate(row.updatedAt)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 w-16 shrink-0"
                        onClick={() => openDismiss(row.id, row.title || "Untitled", activeSignal)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
                {dismissState && (
                  <ContentHealthDismissDialog
                    open={dismissState.open}
                    onOpenChange={handleDismissOpenChange}
                    pageId={dismissState.pageId}
                    pageTitle={dismissState.pageTitle}
                    kind={dismissState.kind}
                  />
                )}
              </>
            )}

            {(cursorState.hasPrevious || hasMore) && (
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!cursorState.hasPrevious}
                  className="text-xs h-7"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {cursorState.pageNumber}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasMore}
                  className="text-xs h-7"
                >
                  Next
                </Button>
              </div>
            )}
          </section>
        </div>
      </PageState>
    </PageWrapper>
  );
}
