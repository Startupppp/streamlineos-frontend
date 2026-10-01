"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { Building2 } from "lucide-react";
import { ErrorState } from "@/components/shared";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn, resolveImageUrl } from "@/lib/utils";
import type { OrgChartNode } from "./types";
import { useHrOrgChart } from "./use-org-chart";

export const ORG_CHART_PAGE_SIZE = 20;

interface PageButtonsProps {
  page: number;
  hasNext: boolean;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function OrgChartPageButtons({
  page,
  hasNext,
  disabled,
  onPrevious,
  onNext,
}: PageButtonsProps) {
  if (page === 1 && !hasNext) return null;

  return (
    <nav aria-label="Organization chart pages" className="flex items-center gap-2">
      <AnimatedIconButton
        icon={ChevronLeftIcon}
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || page === 1}
        onClick={onPrevious}
      >
        Previous
      </AnimatedIconButton>
      <span className="text-xs font-medium tabular-nums text-muted-foreground">
        Page {page}
      </span>
      <AnimatedIconButton
        icon={ChevronRightIcon}
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || !hasNext}
        onClick={onNext}
      >
        Next
      </AnimatedIconButton>
    </nav>
  );
}

function BranchSkeleton() {
  return (
    <div className="space-y-2 border-l border-border/60 pl-4">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

function OrgChartNodeSummary({ employee }: { employee: OrgChartNode }) {
  return (
    <>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={resolveImageUrl(employee.image)} />
        <AvatarFallback className="bg-primary/10 text-xs text-primary">
          {employee.name?.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TruncatedText text={employee.name ?? "Unnamed"} className="text-sm font-semibold" />
        <TruncatedText
          text={employee.designation ?? employee.role ?? ""}
          className="text-xs text-muted-foreground"
        />
      </div>
      {employee.departmentName ? (
        <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          {employee.departmentName}
        </span>
      ) : null}
    </>
  );
}

interface OrgChartBranchProps {
  employee: OrgChartNode;
  lineage: readonly string[];
  focusedId?: string | null;
  onSelect: (employee: OrgChartNode) => void;
}

export function OrgChartBranch({
  employee,
  lineage,
  focusedId,
  onSelect,
}: OrgChartBranchProps) {
  const [expanded, setExpanded] = useState(false);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors.at(-1);
  const isCycle = lineage.includes(employee.id);
  const isFocused = focusedId === employee.id;
  const cardRef = useRef<HTMLButtonElement>(null);
  const query = useHrOrgChart(
    { parentId: employee.id, cursor, limit: ORG_CHART_PAGE_SIZE },
    { enabled: expanded && employee.hasDirectReports && !isCycle },
  );
  const childLineage = [...lineage, employee.id];
  const children = (query.data?.data ?? []).filter(
    (child) => !childLineage.includes(child.id),
  );

  useEffect(() => {
    if (isFocused) cardRef.current?.scrollIntoView({ block: "nearest" });
  }, [isFocused]);

  function handleToggle() {
    setExpanded((current) => !current);
  }

  function handlePrevious() {
    setCursors((current) => current.slice(0, -1));
  }

  function handleNext() {
    const nextCursor = query.data?.pageInfo?.nextCursor;
    if (nextCursor) setCursors((current) => [...current, nextCursor]);
  }

  function handleRetry() {
    void query.refetch();
  }

  const handleSelect = useCallback(() => onSelect(employee), [onSelect, employee]);

  return (
    <li className="min-w-72 space-y-2">
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-lg border bg-card p-2 shadow-panel",
          isFocused ? "border-status-info-rule ring-2 ring-ring" : "border-border",
        )}
      >
        {employee.hasDirectReports && !isCycle ? (
          <AnimatedIconButton
            icon={expanded ? ChevronDownIcon : ChevronRightIcon}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label={`${expanded ? "Collapse" : "Expand"} direct reports for ${employee.name}`}
            aria-expanded={expanded}
            onClick={handleToggle}
          />
        ) : (
          <span className="h-7 w-7 shrink-0" aria-hidden="true" />
        )}
        <button
          ref={cardRef}
          type="button"
          onClick={handleSelect}
          aria-label={`Open details for ${employee.name ?? "this person"}`}
          aria-current={isFocused ? "true" : undefined}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
        >
          <OrgChartNodeSummary employee={employee} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-4 space-y-2 border-l border-border/60 pl-4">
          {query.isPending ? <BranchSkeleton /> : null}
          {query.isError ? (
            <ErrorState
              compact
              title="Couldn't load direct reports"
              description={getErrorMessage(query.error)}
              onRetry={handleRetry}
            />
          ) : null}
          {query.isSuccess && children.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">No visible direct reports.</p>
          ) : null}
          {children.length > 0 ? (
            <ul className="space-y-2">
              {children.map((child) => (
                <OrgChartBranch
                  key={child.id}
                  employee={child}
                  lineage={childLineage}
                  focusedId={focusedId}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          ) : null}
          {query.data ? (
            <OrgChartPageButtons
              page={cursors.length}
              hasNext={query.data.pageInfo?.hasMore ?? false}
              disabled={query.isFetching}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
