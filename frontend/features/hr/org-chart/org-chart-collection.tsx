"use client";

import { useCallback, useState } from "react";
import { AlertCircle, Network } from "lucide-react";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { Card, CardContent } from "@/components/ui/card";
import { PAGE_BODY_EMPTY_CLASS } from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrgChartNode } from "./types";
import {
  splitOrgChartRoots,
  topLevelRootsHeading,
  unassignedRootsHeading,
} from "./org-chart-roots";
import {
  ORG_CHART_PAGE_SIZE,
  OrgChartBranch,
  OrgChartPageButtons,
} from "./org-chart-branch";
import { OrgChartRootsSection } from "./org-chart-roots-section";
import { useHrOrgChart } from "./use-org-chart";

export const NO_HIERARCHY_COPY = "No hierarchy set — ask HR to assign managers.";

interface OrgChartCollectionProps {
  search?: string;
  onSelect: (employee: OrgChartNode) => void;
}

export function OrgChartCollection({ search, onSelect }: OrgChartCollectionProps) {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors.at(-1);
  const query = useHrOrgChart({ search, cursor, limit: ORG_CHART_PAGE_SIZE });

  const handlePrevious = useCallback(
    () => setCursors((current) => current.slice(0, -1)),
    [],
  );
  const handleNext = useCallback(() => {
    const nextCursor = query.data?.pageInfo?.nextCursor;
    if (nextCursor) setCursors((current) => [...current, nextCursor]);
  }, [query.data?.pageInfo?.nextCursor]);
  const handleRetry = useCallback(() => void query.refetch(), [query]);

  const pageState = usePageState({
    permission: "hr:employees:view",
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error,
  });

  if (pageState.kind !== "ready" || query.isPending || query.isError) {
    return (
      <PageState
        resolution={pageState}
        className="flex-1 min-h-0"
        onRetry={handleRetry}
        loading={
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {Array.from({ length: 9 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        {null}
      </PageState>
    );
  }

  const nodes = query.data.data;

  if (nodes.length === 0) {
    return (
      <EmptyState
        className={PAGE_BODY_EMPTY_CLASS}
        illustrationPreset="companies"
        title={search ? "No people found" : NO_HIERARCHY_COPY}
        description={
          search
            ? "Try a different name, designation, or department."
            : "Assign a reporting manager to each employee and the chart builds itself."
        }
      />
    );
  }

  const emptyNodes: OrgChartNode[] = [];
  const { owner, topLevel, unassigned } = search
    ? { owner: nodes, topLevel: emptyNodes, unassigned: emptyNodes }
    : splitOrgChartRoots(nodes);
  const topLevelHeading = topLevelRootsHeading();
  const unassignedHeading = unassignedRootsHeading(
    owner.length + topLevel.length > 0,
  );
  const focusedId = search ? (nodes[0]?.id ?? null) : null;

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-3 touch-pan-x touch-pan-y">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Network className="h-4 w-4" aria-hidden="true" />
          {search
            ? "Search results; expand a person to load their direct reports."
            : "People you can see who report to nobody above them. Expand a person to load one branch at a time."}
        </div>
        {owner.length > 0 ? (
          <ul className="min-w-max space-y-2">
            {owner.map((employee) => (
              <OrgChartBranch
                key={employee.id}
                employee={employee}
                lineage={[]}
                focusedId={focusedId}
                onSelect={onSelect}
              />
            ))}
          </ul>
        ) : null}
        <OrgChartRootsSection
          icon={Network}
          title={topLevelHeading.title}
          description={topLevelHeading.description}
          nodes={topLevel}
          focusedId={focusedId}
          onSelect={onSelect}
        />
        <OrgChartRootsSection
          icon={AlertCircle}
          title={unassignedHeading.title}
          description={unassignedHeading.description}
          nodes={unassigned}
          dashed
          focusedId={focusedId}
          onSelect={onSelect}
        />
        <OrgChartPageButtons
          page={cursors.length}
          hasNext={query.data.pageInfo?.hasMore ?? false}
          disabled={query.isFetching}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      </CardContent>
    </Card>
  );
}
