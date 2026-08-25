"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { EmptyTimeIllustration } from "@/components/illustrations";

const CARD_CLASS =
  "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden";

export function WorkLogDeptPromptCard() {
  return (
    <Card className={CARD_CLASS}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <div className="w-8 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-muted-foreground" />
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
      <CardContent className="py-12">
        <div
          className="flex flex-col items-center justify-center gap-3"
          role="status"
          aria-label="Loading work logs"
        >
          <Loader2 className="w-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wider">
            Loading work logs
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkLogErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className={CARD_CLASS}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <p className="text-sm font-semibold text-foreground">Failed to load work logs</p>
          <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
          <Button variant="outline" size="sm" className="mt-1" onClick={onRetry}>
            Try Again
          </Button>
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
  return (
    <Card className={CARD_CLASS}>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <EmptyTimeIllustration className="mb-2 h-40 w-40 opacity-95" />
          <h3 className="text-sm font-semibold text-foreground">No results found</h3>
          <p className="text-sm text-muted-foreground">
            No work logs match &ldquo;{searchTerm}&rdquo;. Try a different keyword or date.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={onClear}>
            Clear Search
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4 border-l-emerald-500">
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
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
