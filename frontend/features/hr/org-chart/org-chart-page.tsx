"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@animateicons/react/lucide";
import { Building2, Network } from "lucide-react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { ErrorState } from "@/components/shared";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  FILTER_TOOLBAR_ROW,
  PAGE_BODY_EMPTY_CLASS,
} from "@/components/ui/content-fill-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";
import type { OrgChartNode } from "./types";
import { useHrOrgChart } from "./use-org-chart";

const PAGE_SIZE = 20;

interface PageButtonsProps {
  page: number;
  hasNext: boolean;
  disabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

function PageButtons({
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

function PersonSummary({ employee }: { employee: OrgChartNode }) {
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

function OrgChartBranch({
  employee,
  lineage,
}: {
  employee: OrgChartNode;
  lineage: readonly string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors.at(-1);
  const isCycle = lineage.includes(employee.id);
  const query = useHrOrgChart(
    { parentId: employee.id, cursor, limit: PAGE_SIZE },
    { enabled: expanded && employee.hasDirectReports && !isCycle },
  );
  const childLineage = [...lineage, employee.id];
  const children = (query.data?.data ?? []).filter(
    (child) => !childLineage.includes(child.id),
  );

  function handleToggle() {
    setExpanded((current) => !current);
  }

  function handlePrevious() {
    setCursors((current) => current.slice(0, -1));
  }

  function handleNext() {
    const nextCursor = query.data?.pageInfo.nextCursor;
    if (nextCursor) setCursors((current) => [...current, nextCursor]);
  }

  function handleRetry() {
    void query.refetch();
  }

  return (
    <li className="min-w-72 space-y-2">
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-panel">
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
        <PersonSummary employee={employee} />
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
                <OrgChartBranch key={child.id} employee={child} lineage={childLineage} />
              ))}
            </ul>
          ) : null}
          {query.data ? (
            <PageButtons
              page={cursors.length}
              hasNext={query.data.pageInfo.hasMore}
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

function OrgChartCollection({ search }: { search?: string }) {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const cursor = cursors.at(-1);
  const query = useHrOrgChart({ search, cursor, limit: PAGE_SIZE });

  function handlePrevious() {
    setCursors((current) => current.slice(0, -1));
  }

  function handleNext() {
    const nextCursor = query.data?.pageInfo.nextCursor;
    if (nextCursor) setCursors((current) => [...current, nextCursor]);
  }

  function handleRetry() {
    void query.refetch();
  }

  if (query.isPending) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {Array.from({ length: 9 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        className="flex-1 min-h-0"
        title="Couldn't load the organization chart"
        description={getErrorMessage(query.error)}
        onRetry={handleRetry}
      />
    );
  }

  if (query.data.data.length === 0) {
    return (
      <EmptyState
        className={PAGE_BODY_EMPTY_CLASS}
        illustrationPreset="companies"
        title={search ? "No people found" : "No reporting structure found"}
        description={
          search
            ? "Try a different name, designation, or department."
            : "Active employees will appear here when reporting lines are assigned."
        }
      />
    );
  }

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Network className="h-4 w-4" aria-hidden="true" />
          {search
            ? "Search results; expand a person to load their direct reports."
            : "Roots in your access scope; expand a person to load one branch at a time."}
        </div>
        <ul className="min-w-max space-y-2">
          {query.data.data.map((employee) => (
            <OrgChartBranch key={employee.id} employee={employee} lineage={[]} />
          ))}
        </ul>
        <PageButtons
          page={cursors.length}
          hasNext={query.data.pageInfo.hasMore}
          disabled={query.isFetching}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      </CardContent>
    </Card>
  );
}

export function OrgChartPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInput = searchParams.get("q") ?? "";
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const validSearch = debouncedSearch.length >= 2 ? debouncedSearch : undefined;

  function handleSearchChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value.trim()) next.set("q", value);
    else next.delete("q");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <PageWrapper
      title="Organization chart"
      subtitle="Explore reporting lines without loading the entire workforce."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            value={searchInput}
            onValueChange={handleSearchChange}
            placeholder="Search people, roles, departments…"
            maxLength={100}
          />
        </div>
      }
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      {debouncedSearch.length === 1 ? (
        <EmptyState
          className={PAGE_BODY_EMPTY_CLASS}
          illustrationPreset="companies"
          title="Keep typing"
          description="Enter at least two characters to search the organization."
        />
      ) : (
        <OrgChartCollection key={validSearch ?? "roots"} search={validSearch} />
      )}
    </PageWrapper>
  );
}
