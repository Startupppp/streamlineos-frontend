"use client";

import { useState } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyReportIllustration } from "@/components/illustrations";
import { useSurveys, type SurveyMode, type SurveyStatus } from "@/hooks/api/surveys/forms";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { SurveyCard } from "./survey-card";
import { SurveyListFilters } from "./survey-list-filters";

export function SurveysPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SurveyStatus | "all">("all");
  const [mode, setMode] = useState<SurveyMode | "all">("all");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: surveys, isLoading, isError, refetch } = useSurveys({
    search: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    mode: mode === "all" ? undefined : mode,
    pageSize: 100,
  });

  const filteredSurveys = surveys?.filter((survey) => {
    if (status !== "all" && survey.status !== status) return false;
    if (mode !== "all" && survey.mode !== mode) return false;
    return true;
  });

  const hasAnySurveys = (surveys?.length ?? 0) > 0 || Boolean(debouncedSearch) || status !== "all" || mode !== "all";

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
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                New Survey
              </Link>
            ) : undefined
          }
          filters={
            hasAnySurveys ? (
              <SurveyListFilters
                search={search}
                onSearchChange={setSearch}
                status={status}
                onStatusChange={setStatus}
                mode={mode}
                onModeChange={setMode}
              />
            ) : undefined
          }
        >
          <div className="flex flex-1 min-h-0 flex-col">
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState description="Failed to load surveys." onRetry={refetch} />
            ) : filteredSurveys && filteredSurveys.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSurveys.map((survey) => (
                  <SurveyCard key={survey.id} survey={survey} />
                ))}
              </div>
            ) : (
              <EmptyState
                illustration={<EmptyReportIllustration className="h-28 w-28" />}
                title="No Survey Found"
                description="Create a survey, assessment, live session, or lead qualification form to get started."
                action={{ label: "New Survey", href: "/surveys/new" }}
                className="flex-1"
              />
            )}
          </div>
        </PageWrapper>
      </RequireModule>
    </DashboardGate>
  );
}
