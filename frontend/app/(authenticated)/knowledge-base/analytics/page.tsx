"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Eye,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  X,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/charts/metric-card";
import { useKbAnalyticsOverview, useKbNoResults } from "@/lib/api/hooks/kb";
import { getApiError } from "@/lib/api-client";
import type { KbAnalyticsRange } from "@/types/kb";

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function KnowledgeBaseAnalyticsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMemo<KbAnalyticsRange>(() => {
    const result: KbAnalyticsRange = {};
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999`) : null;
    if (fromDate && !Number.isNaN(fromDate.getTime())) result.from = fromDate.toISOString();
    if (toDate && !Number.isNaN(toDate.getTime())) result.to = toDate.toISOString();
    return result;
  }, [from, to]);

  const overviewQuery = useKbAnalyticsOverview(range);
  const noResultsQuery = useKbNoResults(range);

  const overview = overviewQuery.data;
  const noResults = noResultsQuery.data ?? [];
  const topArticles = overview?.topArticles ?? [];
  const hasFilter = from !== "" || to !== "";

  function handleFromChange(event: ChangeEvent<HTMLInputElement>) {
    setFrom(event.target.value);
  }

  function handleToChange(event: ChangeEvent<HTMLInputElement>) {
    setTo(event.target.value);
  }

  function handleClearFilter() {
    setFrom("");
    setTo("");
  }

  function handleRetry() {
    overviewQuery.refetch();
    noResultsQuery.refetch();
  }

  function handleRetryNoResults() {
    noResultsQuery.refetch();
  }

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="kb-analytics-from" className="text-[11px] font-medium text-muted-foreground">
          From
        </label>
        <Input
          id="kb-analytics-from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={handleFromChange}
          className="h-8 w-auto"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="kb-analytics-to" className="text-[11px] font-medium text-muted-foreground">
          To
        </label>
        <Input
          id="kb-analytics-to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={handleToChange}
          className="h-8 w-auto"
        />
      </div>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={handleClearFilter} className="h-8">
          <X className="mr-1 h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Analytics"
      subtitle="Understand usage, content gaps, and trust across your knowledge base."
      filters={filters}
    >
      {overviewQuery.isLoading ? (
        <LoadingState variant="page" className="p-0" />
      ) : overviewQuery.error || !overview ? (
        <ErrorState
          description={
            overviewQuery.error ? getApiError(overviewQuery.error) : "No analytics available."
          }
          onRetry={handleRetry}
          className="min-h-[55vh]"
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="Total views" value={formatNumber(overview.totalViews)} icon={Eye} />
            <MetricCard
              label="Search success rate"
              value={formatPercent(overview.searchSuccessRate)}
              icon={Search}
            />
            <MetricCard label="AI answers" value={formatNumber(overview.aiAnswers)} icon={Sparkles} />
            <MetricCard
              label="Helpful ratio"
              value={formatPercent(overview.helpfulRatio)}
              icon={ThumbsUp}
            />
            <MetricCard
              label="Trust Score"
              value={formatPercent(overview.trustScore)}
              icon={ShieldCheck}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Searches with no results</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Top queries that returned nothing — likely content gaps to fill.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {noResultsQuery.isLoading ? (
                  <LoadingState variant="table" rows={5} />
                ) : noResultsQuery.error ? (
                  <ErrorState
                    compact
                    description={getApiError(noResultsQuery.error)}
                    onRetry={handleRetryNoResults}
                    className="m-4"
                  />
                ) : noResults.length === 0 ? (
                  <EmptyState
                    compact
                    title="No content gaps"
                    description="Every recent search returned at least one article."
                    className="py-10"
                  />
                ) : (
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Query</TableHead>
                        <TableHead className="w-20 text-right">Count</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {noResults.map((row, index) => {
                        const query = row.query?.trim() ?? "";
                        const hasQuery = query.length > 0;
                        const askHref = `/knowledge-base/ask?q=${encodeURIComponent(query)}`;
                        return (
                          <TableRow key={`${row.query ?? "empty"}-${index}`}>
                            <TableCell>
                              {hasQuery ? (
                                <Link
                                  href={askHref}
                                  title={query}
                                  className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                                >
                                  {query}
                                </Link>
                              ) : (
                                <span className="italic text-muted-foreground">(empty query)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatNumber(row.count)}
                            </TableCell>
                            <TableCell>
                              {hasQuery && (
                                <Link
                                  href={askHref}
                                  aria-label={`Ask about ${query}`}
                                  className="text-muted-foreground transition-colors hover:text-primary"
                                >
                                  <ArrowUpRight className="h-4 w-4" />
                                </Link>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top articles</CardTitle>
                <p className="text-xs text-muted-foreground">Most viewed articles in this period.</p>
              </CardHeader>
              <CardContent className="p-0">
                {topArticles.length === 0 ? (
                  <EmptyState
                    compact
                    title="No views yet"
                    description="Article views will appear here once readers start browsing."
                    className="py-10"
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {topArticles.map((article, index) => (
                      <li key={article.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          {article.spaceId !== null ? (
                            <Link
                              href={`/knowledge-base/spaces/${article.spaceId}/articles/${article.id}`}
                              title={article.title}
                              className="block truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {article.title}
                            </Link>
                          ) : (
                            <span
                              title={article.title}
                              className="block truncate text-sm font-medium text-foreground"
                            >
                              {article.title}
                            </span>
                          )}
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {formatNumber(article.viewCount)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" /> {formatNumber(article.helpfulCount)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
