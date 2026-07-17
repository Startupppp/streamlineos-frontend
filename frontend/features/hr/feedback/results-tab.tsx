"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useFeedbackResults } from "@/hooks/api/hr";
import { BarChart3, CheckCircle2, Star, TrendingUp } from "lucide-react";

export function ResultsTab() {
  const [subjectId, setSubjectId] = useState("");
  const [searched, setSearched] = useState("");

  const { data: results, isLoading, isError } = useFeedbackResults(searched);

  function handleSearch() {
    setSearched(subjectId.trim());
  }

  const completionPct =
    results && results.totalRequests > 0
      ? Math.round((results.completedRequests / results.totalRequests) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="max-w-xs min-w-0 flex-1">
          <UserCombobox
            value={subjectId}
            onChange={setSubjectId}
            placeholder="Select employee"
          />
        </div>
        <Button onClick={handleSearch} variant="outline">
          Search
        </Button>
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
        <div className="bg-card rounded-2xl border border-red-200 p-6 text-center text-red-500">
          No results found for this employee
        </div>
      )}

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5"
        >
          <h3 className="font-semibold text-foreground">Results for {results.subjectId}</h3>
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
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
