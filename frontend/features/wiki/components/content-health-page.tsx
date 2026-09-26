"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { useUrlFilters, parseEnum } from "@/lib/url-state/use-url-filters";
import {
  useContentHealthCounts,
  useContentHealthSignals,
  useAssignHealthItem,
  useBulkRepairHealthItems,
  useContentHealthEvidence,
  useContentHealthTrend,
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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

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
  contradictory_claim: "Pages that make claims conflicting with another page on the same topic",
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

interface EvidencePopoverProps {
  pageId: number;
  kind: ContentHealthSignalType;
}

function EvidencePopover({ pageId, kind }: EvidencePopoverProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useContentHealthEvidence(
    open ? pageId : null,
    open ? kind : null,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7 w-20 shrink-0"
          aria-label="View evidence for this signal"
        >
          Evidence
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="end">
        <p className="text-xs font-medium text-foreground mb-2">
          Signal evidence
        </p>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : data?.evidence ? (
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
            {JSON.stringify(data.evidence, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">No evidence recorded.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface HealthTrendWidgetProps {
  activeSignal: ContentHealthSignalType;
}

function HealthTrendWidget({ activeSignal }: HealthTrendWidgetProps) {
  const { data, isLoading } = useContentHealthTrend();
  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!data) return null;

  const delta = data.afterCount - data.beforeCount;
  const improved = delta < 0;
  const deltaLabel = improved
    ? `${Math.abs(delta)} fewer issues than 30 days ago`
    : delta === 0
      ? "No change in 30 days"
      : `${delta} more issues than 30 days ago`;

  return (
    <div className="rounded-xl border border-border bg-card/60 px-4 py-3 flex items-center gap-4">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Before (30 days ago)</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">{data.beforeCount}</span>
      </div>
      <span className="text-muted-foreground text-sm">→</span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Now ({SIGNAL_LABELS[activeSignal]})</span>
        <span className={`text-lg font-semibold tabular-nums ${improved ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
          {data.afterCount}
        </span>
      </div>
      <p className="text-xs text-muted-foreground ml-auto text-right">{deltaLabel}</p>
    </div>
  );
}

interface BulkRepairDialogProps {
  selectedIds: number[];
  activeSignal: ContentHealthSignalType;
  onClose: () => void;
}

const REPAIR_ACTIONS = [
  { value: "request_review", label: "Request review" },
  { value: "assign_owner", label: "Assign owner" },
  { value: "mark_needs_content", label: "Mark needs content" },
] as const;

type RepairAction = (typeof REPAIR_ACTIONS)[number]["value"];

function BulkRepairDialog({ selectedIds, activeSignal, onClose }: BulkRepairDialogProps) {
  const bulkRepair = useBulkRepairHealthItems();
  const [repairAction, setRepairAction] = useState<RepairAction>("request_review");

  function handleRepairActionChange(value: string) {
    const next = REPAIR_ACTIONS.find((action) => action.value === value);
    if (next) setRepairAction(next.value);
  }

  function handleConfirm() {
    bulkRepair.mutate(
      { pageIds: selectedIds, kind: activeSignal, repairAction },
      {
        onSuccess: (result) => {
          const count = result.results.filter((r) => r.outcome === "applied").length;
          toast.success(`Repaired ${count} pages`);
          onClose();
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-sm font-semibold text-foreground">
          Bulk repair — {selectedIds.length} pages
        </h2>
        <Select
          value={repairAction}
          onValueChange={handleRepairActionChange}
        >
          <SelectTrigger className="w-full h-8 text-xs" aria-label="Repair action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPAIR_ACTIONS.map((action) => (
              <SelectItem key={action.value} value={action.value} className="text-xs">
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 justify-end pt-2">
          <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            className="text-xs h-7"
            onClick={handleConfirm}
            isPending={bulkRepair.isPending}
            loadingText="Repairing…"
          >
            Confirm
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}

interface AssignPopoverProps {
  pageId: number;
  kind: ContentHealthSignalType;
}

function AssignPopover({ pageId, kind }: AssignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [membershipId, setMembershipId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const assign = useAssignHealthItem();

  function handleAssign() {
    const parsed = parseInt(membershipId, 10);
    if (!Number.isFinite(parsed)) return;
    assign.mutate(
      { pageId, kind, assigneeMembershipId: parsed, dueAt: dueAt || undefined },
      {
        onSuccess: () => {
          toast.success("Assigned");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7 w-16 shrink-0"
          aria-label="Assign this page"
        >
          Assign
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-2" align="end">
        <p className="text-xs font-medium text-foreground">Assign owner</p>
        <input
          type="number"
          placeholder="Membership ID"
          value={membershipId}
          onChange={(e) => setMembershipId(e.target.value)}
          className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Membership ID"
        />
        <input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="w-full h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Due date"
        />
        <LoadingButton
          type="button"
          size="sm"
          className="w-full text-xs h-7"
          onClick={handleAssign}
          disabled={!membershipId}
          isPending={assign.isPending}
          loadingText="Saving…"
        >
          Save
        </LoadingButton>
      </PopoverContent>
    </Popover>
  );
}

export default function ContentHealthPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });
  const cursorState = useCursorPagination();
  const { state: dismissState, openDismiss, closeDialog } = useDismissDialog();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRepairOpen, setBulkRepairOpen] = useState(false);

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
    setSelectedIds(new Set());
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

  function handleRowSelect(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(rows.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleBulkRepairClose() {
    setBulkRepairOpen(false);
    setSelectedIds(new Set());
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

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

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

          <HealthTrendWidget activeSignal={activeSignal} />

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
              <div className="flex items-center gap-2">
                {someSelected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => setBulkRepairOpen(true)}
                  >
                    Bulk repair ({selectedIds.size})
                  </Button>
                )}
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
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all rows"
                      className="shrink-0"
                    />
                    <span className="flex-1 text-xs font-medium text-muted-foreground">
                      Title
                    </span>
                    <span className="text-xs font-medium text-muted-foreground w-12 text-right">
                      Impact
                    </span>
                    <span className="text-xs font-medium text-muted-foreground w-24 text-right">
                      Updated
                    </span>
                    <span className="w-48" />
                  </div>
                  {rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(checked) => handleRowSelect(row.id, !!checked)}
                        aria-label={`Select ${row.title || "Untitled"}`}
                        className="shrink-0"
                      />
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
                      <div className="flex items-center gap-1 shrink-0">
                        <EvidencePopover pageId={row.id} kind={activeSignal} />
                        <AssignPopover pageId={row.id} kind={activeSignal} />
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

      {bulkRepairOpen && someSelected && (
        <BulkRepairDialog
          selectedIds={Array.from(selectedIds)}
          activeSignal={activeSignal}
          onClose={handleBulkRepairClose}
        />
      )}
    </PageWrapper>
  );
}
