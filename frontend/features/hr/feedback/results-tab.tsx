"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { UserCombobox } from "@/components/ui/user-combobox";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useFeedbackResults } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { BarChart3, CheckCircle2, Star, TrendingUp } from "lucide-react";

export function ResultsTab() {
  const [searched, setSearched] = useState("");

  const { data: results, isLoading, isError, error, refetch } = useFeedbackResults(searched);
  // Surface gate only; the per-employee read keeps its own branches below.
  const pageState = usePageState({ permission: "hr:performance:view", isLoading: false, isError: false, error: null });

  // Picking an employee loads their results; a separate Search button repeated the pick.
  function handleSubjectChange(id: string) {
    setSearched(id.trim());
  }

  const completionPct =
    results && results.totalRequests > 0
      ? Math.round((results.completedRequests / results.totalRequests) * 100)
      : 0;

  return (
    <PageState resolution={pageState} loading={null} className="flex-1">
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="max-w-xs min-w-0 flex-1">
          <UserCombobox
            value={searched}
            onChange={handleSubjectChange}
            placeholder="Select employee"
          />
        </div>
      </div>

      {!searched && (
        <EmptyState
          illustrationPreset="search"
          title="Select an employee to view 360° feedback results"
          description="Choose an employee above"
          className={CONTENT_FILL_PANEL}
        />
      )}

      {searched && isLoading && (
        <div className="bg-card rounded-2xl border border-border p-8 animate-pulse space-y-4">
          <div className="h-5 w-1/3 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
          </div>
        </div>
      )}

      {searched && isError && (
        <ErrorState
          title="Couldn't load feedback results"
          description={getErrorMessage(error)}
          onRetry={refetch}
          className={CONTENT_FILL_PANEL}
        />
      )}

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5"
        >
          <h3 className="font-semibold text-foreground">360° feedback results</h3>
          <StatCardGrid cols={4}>
            <StatCard label="Total Requests" value={results.totalRequests} icon={BarChart3} tone="default" />
            <StatCard label="Completed" value={results.completedRequests} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Avg Rating" value={results.avgRating !== undefined ? results.avgRating.toFixed(1) : "—"} icon={Star} tone="accent" />
            <StatCard label="Completion" value={`${completionPct}%`} icon={TrendingUp} tone="accent" />
          </StatCardGrid>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Completion rate</span>
              <span>{completionPct}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
    </PageState>
  );
}
