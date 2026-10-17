"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTimeIllustration } from "@/components/illustrations";

const CARD_CLASS =
  "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden";

export function WorkLogDeptPromptCard() {
  return (
    <Card className={CARD_CLASS}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <p className="text-sm text-muted-foreground">
            Department filter is applied. Select an employee from this department to view their work logs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkLogLoadingCard() {
  return (
    <Card className={CARD_CLASS}>
      <CardContent className="py-8" role="status" aria-label="Loading work logs">
        <div className="space-y-3 px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkLogNoResultsCard({
  searchTerm,
  onClear,
}: {
  searchTerm: string;
  onClear: () => void;
}) {
  const term = searchTerm.trim();
  return (
    <EmptyState
      className="flex-1"
      illustration={<EmptyTimeIllustration className="h-40 w-40" />}
      title="No work logs"
      filtersActive
      filteredTitle={term ? `No work logs match "${term}"` : undefined}
      description={
        term
          ? "Try a different keyword or date."
          : "No days fall inside the selected month or date range."
      }
      onClearFilters={onClear}
    />
  );
}

export function WorkLogTotalHoursCard({
  totalHours,
  quarter,
  year,
}: {
  totalHours: number;
  quarter: number;
  year: number;
}) {
  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-card overflow-hidden border-l-4 border-l-status-success-fill">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-bold tabular-nums text-status-success-ink">
              {totalHours}
              <span className="text-lg ml-1 font-semibold">h</span>
            </p>
            <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
              Total logged — Q{quarter} {year}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
