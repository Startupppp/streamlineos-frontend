"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CONTENT_FILL_PANEL,
  ContentFillPanel,
} from "@/components/ui/content-fill-panel";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatIstDate } from "@/lib/hrms/payroll-cutoff";
import { ActionCenterFilters } from "@/features/hr/action-center/action-center-filters";
import { ActionCenterBulkBar } from "@/features/hr/action-center/action-center-bulk-bar";
import { ActionCenterRow } from "@/features/hr/action-center/action-center-row";
import { SourceNotices } from "@/features/hr/action-center/source-notices";
import { useActionCenterDecisions } from "@/features/hr/action-center/use-action-center-decisions";
import {
  ACTION_CENTER_NO_FILTERS,
  filterQueueItems,
  filtersActive,
  type ActionCenterFacet,
  type ActionCenterFilterState,
  type ActionCenterItem,
} from "@/features/hr/action-center/queue-item";
import type { ActionCenterQueue } from "@/features/hr/action-center/use-action-center-queue";

interface ActionCenterQueueViewProps {
  queue: ActionCenterQueue;
  onOpenRequester: (item: ActionCenterItem) => void;
}

function facetCounts(
  items: readonly ActionCenterItem[],
): Record<ActionCenterFacet | "all", number> {
  const counts = { all: items.length, leave: 0, wfh: 0, attendance: 0, expense: 0, other: 0 };
  for (const item of items) counts[item.facet] += 1;
  return counts;
}

export function ActionCenterQueueView({
  queue,
  onOpenRequester,
}: ActionCenterQueueViewProps) {
  const [filters, setFilters] = useState<ActionCenterFilterState>(
    ACTION_CENTER_NO_FILTERS,
  );
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [decidedIds, setDecidedIds] = useState<readonly string[]>([]);
  const decisions = useActionCenterDecisions();

  const live = useMemo(
    () => queue.items.filter((item) => !decidedIds.includes(item.id)),
    [queue.items, decidedIds],
  );
  const visible = useMemo(
    () => filterQueueItems(live, filters),
    [live, filters],
  );
  const counts = useMemo(() => facetCounts(live), [live]);
  const cutoffCount = useMemo(
    () => live.filter((item) => item.deadlineAffected).length,
    [live],
  );
  const selected = useMemo(
    () => visible.filter((item) => selectedIds.includes(item.id)),
    [visible, selectedIds],
  );

  const handleFacetChange = useCallback((facet: ActionCenterFacet | "all") => {
    setFilters((current) => ({ ...current, facet }));
    setSelectedIds([]);
  }, []);

  const handleCutoffToggle = useCallback(() => {
    setFilters((current) => ({ ...current, onlyCutoff: !current.onlyCutoff }));
    setSelectedIds([]);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(ACTION_CENTER_NO_FILTERS);
    setSelectedIds([]);
  }, []);

  const handleToggleSelected = useCallback((itemId: string) => {
    setSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleDecide = useCallback(
    (item: ActionCenterItem, decision: "approve" | "reject", reason: string) => {
      void decisions
        .decide(item, decision, reason)
        .then(() => {
          setDecidedIds((current) => [...current, item.id]);
          setSelectedIds((current) => current.filter((id) => id !== item.id));
          toast.success(
            decision === "approve"
              ? `Approved ${item.type} for ${item.requesterLabel}.`
              : `Rejected ${item.type} for ${item.requesterLabel}.`,
          );
        })
        .catch((error: unknown) => {
          toast.error(getErrorMessage(error));
        });
    },
    [decisions],
  );

  const handleDecideMany = useCallback(
    (
      items: readonly ActionCenterItem[],
      decision: "approve" | "reject",
      reason: string,
    ) => {
      void decisions.decideMany(items, decision, reason).then((outcome) => {
        const verb = decision === "approve" ? "approved" : "rejected";
        if (outcome.succeeded === outcome.requested)
          toast.success(`${outcome.succeeded} of ${outcome.requested} ${verb}.`);
        else
          toast.error(
            `${outcome.succeeded} of ${outcome.requested} ${verb}. ${outcome.firstError ?? "The rest were left unchanged."}`,
          );
        setSelectedIds([]);
      });
    },
    [decisions],
  );

  const everySourceDenied = queue.sources.every((source) => source.denied);
  if (everySourceDenied)
    return (
      <NoPermissionState
        permission="hr:workflows:approve"
        description="None of the approval queues are available to your role, so this page has nothing it can show you."
      />
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SourceNotices sources={queue.sources} />

      {queue.cutoff && cutoffCount > 0 ? (
        <p className="px-3 pt-2 text-dense text-muted-foreground">
          <span className="tabular-nums">{cutoffCount}</span>
          {cutoffCount === 1 ? " item affects cutoff " : " items affect cutoff "}
          <span className="tabular-nums">
            {formatIstDate(queue.cutoff.date)}
          </span>
          .
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <ActionCenterFilters
          state={filters}
          counts={counts}
          cutoffAvailable={queue.cutoff !== null}
          cutoffCount={cutoffCount}
          onFacetChange={handleFacetChange}
          onCutoffToggle={handleCutoffToggle}
        />
      </div>

      <ActionCenterBulkBar
        selected={selected}
        isPending={decisions.isBusy}
        onClear={handleClearSelection}
        onDecideMany={handleDecideMany}
      />

      {queue.isLoading ? (
        <ContentFillPanel className="gap-2 p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </ContentFillPanel>
      ) : visible.length === 0 ? (
        <QueueEmptyState
          queue={queue}
          filtersAreActive={filtersActive(filters)}
          onClearFilters={handleClearFilters}
        />
      ) : (
        <ContentFillPanel className="p-0">
          <ul className="divide-border/60">
            <AnimatePresence initial={false}>
              {visible.map((item, index) => (
                <ActionCenterRow
                  key={item.id}
                  item={item}
                  index={index}
                  selected={selectedIds.includes(item.id)}
                  selectable={decisions.canDecide(item.source)}
                  decidable={decisions.canDecide(item.source)}
                  isDeciding={decisions.isDeciding(item.id)}
                  onToggleSelected={handleToggleSelected}
                  onOpenRequester={onOpenRequester}
                  onDecide={handleDecide}
                />
              ))}
            </AnimatePresence>
          </ul>
        </ContentFillPanel>
      )}
    </div>
  );
}

function QueueEmptyState({
  queue,
  filtersAreActive,
  onClearFilters,
}: {
  queue: ActionCenterQueue;
  filtersAreActive: boolean;
  onClearFilters: () => void;
}) {
  if (filtersAreActive)
    return (
      <EmptyState
        illustrationPreset="approval"
        filtersActive
        onClearFilters={onClearFilters}
        className={CONTENT_FILL_PANEL}
      />
    );

  if (!queue.settledAcrossEverySource)
    return (
      <EmptyState
        illustrationPreset="approval"
        title="Nothing pending in the queues you can see"
        description="One or more sources above are unavailable, so this is not a claim about everything waiting on you."
        className={CONTENT_FILL_PANEL}
      />
    );

  const cutoffSentence = queue.cutoff
    ? `Next cutoff: ${formatIstDate(queue.cutoff.date)}. `
    : "";

  return (
    <EmptyState
      illustrationPreset="approval"
      title="You're clear."
      description={`${cutoffSentence}Nothing pending that blocks payroll inputs.`}
      className={CONTENT_FILL_PANEL}
    />
  );
}
