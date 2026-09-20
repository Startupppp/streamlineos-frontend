"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable } from "@/components/ui/data-table";
import { ShieldAlert } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { useCursorPageStack } from "@/hooks/common/use-cursor-page-stack";
import { StateIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useHrCases } from "@/hooks/api/hr/cases";
import type { CaseCategory, CaseStatus, CaseSeverity, HrCase } from "@/hooks/api/hr/cases";
import { CaseDetailSheet } from "./case-detail-sheet";
import { NewCaseSheet } from "./new-case-sheet";
import { AnonymousReportDialog } from "./anonymous-report-dialog";
import { IssueWarningSheet } from "./issue-warning-sheet";
import { CasesFilterBar, isCaseCategory, isCaseSeverity, isCaseStatus } from "./cases-filter-bar";
import { CASE_COLUMNS } from "./case-columns";
import { DisciplinaryActionsTab } from "./disciplinary-actions-tab";

type ActiveTab = "cases" | "disciplinary";

function isActiveTab(value: string): value is ActiveTab {
  return value === "cases" || value === "disciplinary";
}

interface CaseUrlFilters {
  search: string;
  status: CaseStatus | "";
  category: CaseCategory | "";
  severity: CaseSeverity | "";
}

function parseCaseFilters(searchParams: URLSearchParams): CaseUrlFilters {
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const severity = searchParams.get("severity") ?? "";
  return {
    search: searchParams.get("q") ?? "",
    status: isCaseStatus(status) ? status : "",
    category: isCaseCategory(category) ? category : "",
    severity: isCaseSeverity(severity) ? severity : "",
  };
}

export function CasesPageContent() {
  const canManage = useCan("hr:cases:manage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isUrlPending, startUrlTransition] = useTransition();
  const { search: urlSearch, status, category, severity } = parseCaseFilters(searchParams);
  const [searchDraft, setSearchDraft] = useState({ baseline: urlSearch, value: urlSearch });
  const searchDraftLive = isUrlPending || searchDraft.baseline === urlSearch;
  const search = searchDraftLive ? searchDraft.value : urlSearch;
  const debouncedSearch = useDebouncedValue(search, 300);
  const syncedSearchRef = useRef(urlSearch);
  const casePagination = useCursorPageStack();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showAnonymous, setShowAnonymous] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("cases");

  const {
    data: casesData,
    isLoading: casesLoading,
    isError: casesIsError,
    error: casesError,
    refetch: refetchCases,
  } = useHrCases({
    cursor: casePagination.cursor,
    search: urlSearch.trim() || undefined,
    status: status || undefined,
    category: category || undefined,
    severity: severity || undefined,
  });

  const filtersActive =
    urlSearch.trim() !== "" || status !== "" || category !== "" || severity !== "";

  const resetCasesToFirstPage = casePagination.resetToFirstPage;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const query = params.toString();
      startUrlTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
      resetCasesToFirstPage();
    },
    [searchParams, router, pathname, resetCasesToFirstPage],
  );

  useEffect(() => {
    if (syncedSearchRef.current === debouncedSearch) return;
    syncedSearchRef.current = debouncedSearch;
    if (debouncedSearch === urlSearch) return;
    startUrlTransition(() => {
      setSearchDraft((draft) => ({ ...draft, baseline: debouncedSearch }));
      updateParams({ q: debouncedSearch });
    });
  }, [debouncedSearch, urlSearch, updateParams]);

  const handleClearFilters = useCallback(() => {
    setSearchDraft({ baseline: "", value: "" });
    updateParams({ q: null, status: null, category: null, severity: null });
  }, [updateParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchDraft((draft) => ({
      baseline: searchDraftLive ? draft.baseline : urlSearch,
      value,
    }));
  }, [searchDraftLive, urlSearch]);

  const handleStatusChange = useCallback((value: CaseStatus | "") => {
    updateParams({ status: value });
  }, [updateParams]);

  const handleCategoryChange = useCallback((value: CaseCategory | "") => {
    updateParams({ category: value });
  }, [updateParams]);

  const handleSeverityChange = useCallback((value: CaseSeverity | "") => {
    updateParams({ severity: value });
  }, [updateParams]);

  const handleActiveTabChange = useCallback((value: string) => {
    if (isActiveTab(value)) setActiveTab(value);
    resetCasesToFirstPage();
  }, [resetCasesToFirstPage]);

  const handleRetryCases = useCallback(() => {
    void refetchCases();
  }, [refetchCases]);

  const handleOpenNewCase = useCallback(() => setShowNew(true), []);
  const handleOpenAnonymousReport = useCallback(() => setShowAnonymous(true), []);
  const handleOpenIssueAction = useCallback(() => setShowWarning(true), []);

  const handleCaseRowClick = useCallback((row: HrCase) => setSelectedCaseId(row.id), []);

  const handleCaseSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedCaseId(null);
  }, []);

  const casesHasMore = casesData?.pagination.hasMore ?? false;

  const handleCasesNextPage = useCallback(() => {
    casePagination.goToNextPage(casesData?.pagination.nextCursor);
  }, [casePagination, casesData]);

  return (
    <PageWrapper
      title="Employee Relations & Cases"
      subtitle="Manage grievances, investigations, and disciplinary actions"
      filters={
        <CasesFilterBar
          search={search}
          status={status}
          category={category}
          severity={severity}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onCategoryChange={handleCategoryChange}
          onSeverityChange={handleSeverityChange}
        />
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-sm"
            onClick={handleOpenAnonymousReport}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Anonymous Report
          </Button>
          {canManage && (
            <AnimatedIconButton
              icon={PlusIcon}
              iconSize={14}
              iconClassName="mr-1.5"
              size="sm"
              className="gap-1.5 text-sm"
              onClick={handleOpenNewCase}
            >
              New Case
            </AnimatedIconButton>
          )}
        </div>
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={handleActiveTabChange}
        className="flex min-h-0 flex-1 flex-col pb-6"
      >
        <TabsList className="mb-4 shrink-0">
          <TabsTrigger value="cases">Cases</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinary Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="flex flex-1 min-h-0 flex-col gap-2">
            {casesIsError ? (
              <ErrorState
                className="flex-1"
                title="Couldn't load cases"
                description={getErrorMessage(casesError)}
                onRetry={handleRetryCases}
              />
            ) : (
              <DataTable
                className="flex-1 min-h-0"
                columns={CASE_COLUMNS}
                data={casesData?.data ?? []}
                isLoading={casesLoading}
                getRowKey={(row) => row.id}
                onRowClick={handleCaseRowClick}
                emptyState={
                  <EmptyState
                    className="border-0 bg-transparent min-h-[40vh]"
                    illustration={<StateIllustration preset="ticket" className="h-28 w-28" />}
                    title="No cases found"
                    description={
                      filtersActive
                        ? undefined
                        : "Report a grievance, harassment incident, or policy violation to open a case."
                    }
                    filtersActive={filtersActive}
                    onClearFilters={handleClearFilters}
                    action={
                      canManage && !filtersActive
                        ? { label: "New Case", onClick: handleOpenNewCase }
                        : undefined
                    }
                  />
                }
              />
            )}
            {!casesIsError && (casePagination.hasPrevious || casesHasMore) ? (
              <CursorPageControls
                page={casePagination.page}
                hasNext={casesHasMore}
                onPrevious={casePagination.goToPreviousPage}
                onNext={handleCasesNextPage}
              />
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="disciplinary" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <DisciplinaryActionsTab canManage={canManage} onIssueAction={handleOpenIssueAction} />
        </TabsContent>
      </Tabs>

      {selectedCaseId !== null && (
        <CaseDetailSheet
          caseId={selectedCaseId}
          open={selectedCaseId !== null}
          onOpenChange={handleCaseSheetOpenChange}
        />
      )}

      <NewCaseSheet open={showNew} onOpenChange={setShowNew} />
      <AnonymousReportDialog open={showAnonymous} onOpenChange={setShowAnonymous} />
      <IssueWarningSheet open={showWarning} onOpenChange={setShowWarning} />
    </PageWrapper>
  );
}
