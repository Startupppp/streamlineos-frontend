"use client";

import { DatePicker } from "@/components/ui/date-picker";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useAccess } from "@/hooks/api/access";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentHealthSkeleton, SignalRowSkeleton } from "./content-health-skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { UserCombobox } from "@/components/ui/user-combobox";
import { useOrgMembersByIds } from "@/hooks/api/organization";

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
  unowned: "Files with no assigned owner",
  stale: "Files not updated in 90 or more days",
  unverified: "Files in an unverified or expired trust state",
  empty: "Files with no content body",
  overdue_review: "Files with a pending review that is past its due date",
  broken_link: "Files that contain links to deleted or missing files",
  overexposed:
    "Files marked public while their team folder is not a public help centre",
  duplicate_candidate:
    "Files whose content is identical to another file in this org",
  contradictory_claim:
    "Files that make claims conflicting with another file on the same topic",
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
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-3" align="end">
        <p className="text-xs font-medium text-foreground mb-2">
          Signal evidence
        </p>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : data?.evidence ? (
          <pre className="text-micro text-muted-foreground whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
            {JSON.stringify(data.evidence, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">No evidence recorded.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function HealthTrendWidget() {
  const { data, isLoading } = useContentHealthTrend();
  if (isLoading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!data) return null;

  const netChange = data.afterCount - data.beforeCount;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/60 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">
          Open 30 days ago (all signals)
        </span>
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {data.beforeCount}
        </span>
      </div>
      <span className="text-muted-foreground text-sm">→</span>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">
          Open now (all signals)
        </span>
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {data.afterCount}
        </span>
      </div>
      <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto sm:text-right">
        {netChange > 0 ? "+" : ""}
        {netChange} net change in visible open issues
      </p>
    </div>
  );
}

interface BulkRepairDialogProps {
  selectedIds: number[];
  activeSignal: ContentHealthSignalType;
  onClose: () => void;
  onSuccess: () => void;
}

function BulkRepairDialog({
  selectedIds,
  activeSignal,
  onClose,
  onSuccess,
}: BulkRepairDialogProps) {
  const bulkRepair = useBulkRepairHealthItems();
  const [selectedUserId, setSelectedUserId] = useState("");
  const { data: selectedMemberData, isLoading: memberLoading } =
    useOrgMembersByIds(selectedUserId ? [selectedUserId] : []);
  const assigneeMembershipId = selectedMemberData?.data.find(
    (member) => member.userId === selectedUserId,
  )?.membershipId;

  function handleConfirm() {
    if (!assigneeMembershipId) return;
    bulkRepair.mutate(
      {
        pageIds: selectedIds,
        kind: activeSignal,
        repairAction: "assign_owner",
        assigneeMembershipId,
      },
      {
        onSuccess: (result) => {
          const count = result.results.filter(
            (r) => r.outcome === "applied",
          ).length;
          toast.success(`Assigned ${count} issues`);
          onSuccess();
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="md:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Bulk repair — {selectedIds.length}{" "}
            {selectedIds.length === 1 ? "file" : "files"}
          </DialogTitle>
          <DialogDescription>
            Assign a person to resolve the selected issues.
          </DialogDescription>
        </DialogHeader>
        <UserCombobox
          value={selectedUserId}
          onChange={setSelectedUserId}
          placeholder="Select member…"
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={onClose}
          >
            Cancel
          </Button>
          <LoadingButton
            type="button"
            size="sm"
            className="text-xs h-7"
            onClick={handleConfirm}
            disabled={!assigneeMembershipId || memberLoading}
            isPending={bulkRepair.isPending}
            loadingText="Assigning…"
          >
            Confirm
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AssignPopoverProps {
  pageId: number;
  kind: ContentHealthSignalType;
}

function AssignPopover({ pageId, kind }: AssignPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const assign = useAssignHealthItem();

  const { data: selectedMemberData, isLoading: memberLoading } =
    useOrgMembersByIds(selectedUserId ? [selectedUserId] : []);
  const resolvedMembershipId = selectedMemberData?.data.find(
    (m) => m.userId === selectedUserId,
  )?.membershipId;

  function handleUserChange(userId: string) {
    setSelectedUserId(userId);
  }

  function handleDueAtChange(value: string) {
    setDueAt(value);
  }

  function handleAssign() {
    if (!resolvedMembershipId) return;
    assign.mutate(
      {
        pageId,
        kind,
        assigneeMembershipId: resolvedMembershipId,
        dueAt: dueAt || undefined,
      },
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
          aria-label="Assign this file"
        >
          Assign
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(16rem,calc(100vw-2rem))] space-y-2 p-3" align="end">
        <p className="text-xs font-medium text-foreground">Assign owner</p>
        <UserCombobox
          value={selectedUserId}
          onChange={handleUserChange}
          placeholder="Select member…"
        />
        <DatePicker
          value={dueAt}
          onChange={handleDueAtChange}
          ariaLabel="Due date"
          placeholder="Due date"
          dateFormat="dd MMM yyyy"
          clearable
          className="w-full"
        />
        <LoadingButton
          type="button"
          size="sm"
          className="w-full text-xs h-7"
          onClick={handleAssign}
          disabled={!selectedUserId || memberLoading || !resolvedMembershipId}
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
  const {
    data: accessData,
    isError: accessReadError,
    refetch: refetchAccess,
  } = useAccess();
  const { update: updateFilters } = useUrlFilters({ pageParam: "cursor" });
  const { state: dismissState, openDismiss, closeDialog } = useDismissDialog();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRepairOpen, setBulkRepairOpen] = useState(false);

  const activeSignal = parseEnum<readonly ContentHealthSignalType[]>(
    searchParams.get("signal"),
    SIGNAL_TYPES,
    "unowned",
  );

  const rawCursor = searchParams.get("cursor");
  const afterId =
    rawCursor &&
    /^[1-9]\d*$/.test(rawCursor) &&
    Number.isSafeInteger(Number(rawCursor))
      ? Number(rawCursor)
      : undefined;
  const cursor = afterId?.toString();
  const trailEntries = searchParams.get("cursorTrail")?.split(".") ?? [];
  const cursorTrail =
    cursor &&
    trailEntries[0] === "~" &&
    trailEntries
      .slice(1)
      .every(
        (entry) =>
          /^[1-9]\d*$/.test(entry) && Number.isSafeInteger(Number(entry)),
      )
      ? trailEntries
      : cursor
        ? ["~"]
        : [];

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
    error: signalsQueryError,
    refetch: refetchSignals,
  } = useContentHealthSignals({ signalType: activeSignal, afterId });

  function handleSignalSelect(signal: string) {
    setSelectedIds(new Set());
    updateFilters({ signal, cursorTrail: null });
  }

  function handleRetry() {
    if (accessReadError && !accessData) {
      void refetchAccess();
      return;
    }
    void refetchCounts();
    void refetchSignals();
  }

  function handleNext() {
    const next = signalsData?.nextCursor;
    if (next == null) return;
    setSelectedIds(new Set());
    updateFilters({
      cursor: String(next),
      cursorTrail: [...cursorTrail, cursor ?? "~"].join("."),
    });
  }

  function handlePrevious() {
    if (!cursor) return;
    setSelectedIds(new Set());
    const previousCursor = cursorTrail[cursorTrail.length - 1];
    updateFilters({
      cursor: previousCursor === "~" ? null : previousCursor,
      cursorTrail:
        cursorTrail.length > 1 ? cursorTrail.slice(0, -1).join(".") : null,
    });
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
  }

  function handleBulkRepairSuccess() {
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
    error: countsError ? countsQueryError : signalsQueryError,
    isEmpty: allZero,
  });

  const countMap = new Map(
    (countsData?.counts ?? []).map((c) => [c.signalType, c.count]),
  );

  const allSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
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
            description="All files pass every signal check."
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

          <HealthTrendWidget />

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
              <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
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
                    className="h-8 min-w-0 flex-1 text-xs sm:w-44 sm:flex-none"
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
                description="No files match this signal."
                compact
              />
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
                  <div className="hidden items-center gap-3 border-b border-border px-3 py-2 sm:flex">
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
                      className="flex flex-col gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onCheckedChange={(checked) =>
                          handleRowSelect(row.id, !!checked)
                        }
                        aria-label={`Select ${row.title || "Untitled"}`}
                        className="shrink-0"
                      />
                      <Link
                        href={pageHref(row.id)}
                        className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline"
                      >
                        {row.title || "Untitled"}
                      </Link>
                      <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {row.impact}
                      </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 pl-7 sm:ml-auto sm:pl-0">
                      <span className="mr-auto text-xs tabular-nums text-muted-foreground sm:mr-0 sm:w-24 sm:text-right">
                        {kbFormatDate(row.updatedAt)}
                      </span>
                        <EvidencePopover pageId={row.id} kind={activeSignal} />
                        <AssignPopover pageId={row.id} kind={activeSignal} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 w-16 shrink-0"
                          onClick={() =>
                            openDismiss(
                              row.id,
                              row.title || "Untitled",
                              activeSignal,
                            )
                          }
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

            {(Boolean(cursor) || hasMore) && (
              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!cursor}
                  className="text-xs h-7"
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {cursorTrail.length + 1}
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
          onSuccess={handleBulkRepairSuccess}
        />
      )}
    </PageWrapper>
  );
}
