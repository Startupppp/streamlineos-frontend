"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { EmptyReportIllustration } from "@/components/illustrations";
import { usePageState } from "@/hooks/api/use-page-state";
import { useSurveys, type SurveyMode, type SurveyStatus } from "@/hooks/api/surveys/forms";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { TablePagination } from "@/components/ui/table-pagination";
import { SurveyCard } from "./survey-card";
import { SurveyListFilters } from "./survey-list-filters";
import { SurveyListSkeleton } from "./survey-list-skeleton";

export function SurveysPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SurveyStatus | "all">("all");
  const [mode, setMode] = useState<SurveyMode | "all">("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const surveysQuery = useSurveys({
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    mode: mode === "all" ? undefined : mode,
    page,
  });
  const { data: surveysPage, isLoading, isError, error, refetch } = surveysQuery;

  const rows = surveysPage?.items ?? [];
  const total = surveysPage?.total ?? 0;
  const pageSize = surveysPage?.pageSize ?? 50;
  const filtersActive = Boolean(debouncedSearch) || status !== "all" || mode !== "all";
  const hasAnySurveys = rows.length > 0 || filtersActive;

  const pageState = usePageState({
    isLoading,
    isError,
    error,
    isEmpty: rows.length === 0,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatus("all");
    setMode("all");
    setPage(1);
  }, []);

  function handlePageChange(next: number) {
    setPage(next);
  }

  return (
    <DashboardGate permission="surveys:view">
      <RequireModule module="surveys">
        <PageWrapper
          title="Surveys"
          subtitle="Build surveys, quizzes, live polls, and lead forms."
          actions={
            hasAnySurveys ? (
              <Link
                href="/surveys/new"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Create survey
              </Link>
            ) : undefined
          }
          filters={
            hasAnySurveys ? (
              <SurveyListFilters
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={(s) => { setStatus(s); setPage(1); }}
                mode={mode}
                onModeChange={(m) => { setMode(m); setPage(1); }}
              />
            ) : undefined
          }
        >
          <div className="flex min-h-full flex-1 flex-col gap-4">
            <PageState
              resolution={pageState}
              loading={<SurveyListSkeleton />}
              onRetry={handleRetry}
              className="min-h-full flex-1"
              empty={
                <EmptyState
                  illustration={<EmptyReportIllustration className="h-28 w-28" />}
                  title="No surveys yet"
                  description="Create a survey, assessment, live session, or lead qualification form to get started."
                  action={{ label: "Create survey", href: "/surveys/new" }}
                  filtersActive={filtersActive}
                  filteredTitle="No surveys match your filters"
                  onClearFilters={handleClearFilters}
                  access={surveysQuery.access}
                  className="h-full min-h-full flex-1"
                />
              }
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((survey) => (
                  <SurveyCard key={survey.id} survey={survey} />
                ))}
              </div>
            </PageState>
            {total > pageSize && (
              <TablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </PageWrapper>
      </RequireModule>
    </DashboardGate>
  );
}
