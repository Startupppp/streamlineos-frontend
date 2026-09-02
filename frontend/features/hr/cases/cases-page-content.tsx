"use client";

import { useState, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
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
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { getUserDisplayName, type NamedUser } from "@/lib/person-display";
import { useHrCases, useDisciplinaryActions } from "@/hooks/api/hr/cases";
import type { HrCase, CaseCategory, CaseStatus, CaseSeverity } from "@/hooks/api/hr/cases";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CaseStatusBadge, CaseSeverityBadge, CaseCategoryLabel } from "./case-badges";
import { CaseDetailSheet } from "./case-detail-sheet";
import { NewCaseSheet } from "./new-case-sheet";
import { AnonymousReportDialog } from "./anonymous-report-dialog";
import { IssueWarningSheet } from "./issue-warning-sheet";
import { formatDistanceToNow } from "date-fns";

const SENTINEL = "__ALL__";

const STATUS_OPTIONS: { value: CaseStatus | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "under_investigation", label: "Under Investigation" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "dismissed", label: "Dismissed" },
];

const CATEGORY_OPTIONS: { value: CaseCategory | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Categories" },
  { value: "grievance", label: "Grievance" },
  { value: "disciplinary", label: "Disciplinary" },
  { value: "harassment", label: "Harassment" },
  { value: "ethics", label: "Ethics" },
  { value: "performance", label: "Performance" },
  { value: "workplace_conflict", label: "Workplace Conflict" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: { value: CaseSeverity | typeof SENTINEL; label: string }[] = [
  { value: SENTINEL, label: "All Severities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

type ActiveTab = "cases" | "disciplinary";

function isCaseStatus(value: string): value is CaseStatus {
  return STATUS_OPTIONS.some((option) => option.value !== SENTINEL && option.value === value);
}

function isCaseCategory(value: string): value is CaseCategory {
  return CATEGORY_OPTIONS.some((option) => option.value !== SENTINEL && option.value === value);
}

function isCaseSeverity(value: string): value is CaseSeverity {
  return SEVERITY_OPTIONS.some((option) => option.value !== SENTINEL && option.value === value);
}

function isActiveTab(value: string): value is ActiveTab {
  return value === "cases" || value === "disciplinary";
}

export function CasesPageContent() {
  const canManage = useCan("hr:cases:manage");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [category, setCategory] = useState<CaseCategory | "">("");
  const [severity, setSeverity] = useState<CaseSeverity | "">("");
  const casePagination = useCursorPageStack();
  const disciplinaryPagination = useCursorPageStack();
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
    search: debouncedSearch.trim() || undefined,
    status: status || undefined,
    category: category || undefined,
    severity: severity || undefined,
  });

  const {
    data: disciplinaryData,
    isLoading: discLoading,
    isError: discIsError,
    error: discError,
    refetch: refetchDisciplinary,
  } = useDisciplinaryActions({
    cursor: disciplinaryPagination.cursor,
  });

  const filtersActive =
    search.trim() !== "" || status !== "" || category !== "" || severity !== "";

  const resetCasesToFirstPage = casePagination.resetToFirstPage;

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatus("");
    setCategory("");
    setSeverity("");
    resetCasesToFirstPage();
  }, [resetCasesToFirstPage]);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value === SENTINEL || !isCaseStatus(value) ? "" : value);
    resetCasesToFirstPage();
  }, [resetCasesToFirstPage]);

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value === SENTINEL || !isCaseCategory(value) ? "" : value);
    resetCasesToFirstPage();
  }, [resetCasesToFirstPage]);

  const handleSeverityChange = useCallback((value: string) => {
    setSeverity(value === SENTINEL || !isCaseSeverity(value) ? "" : value);
    resetCasesToFirstPage();
  }, [resetCasesToFirstPage]);

  const handleActiveTabChange = useCallback((value: string) => {
    if (isActiveTab(value)) setActiveTab(value);
    resetCasesToFirstPage();
  }, [resetCasesToFirstPage]);

  const handleRetryCases = useCallback(() => {
    void refetchCases();
  }, [refetchCases]);

  const handleRetryDisciplinary = useCallback(() => {
    void refetchDisciplinary();
  }, [refetchDisciplinary]);

  const handleOpenNewCase = useCallback(() => setShowNew(true), []);
  const handleOpenIssueAction = useCallback(() => setShowWarning(true), []);

  const casesHasMore = casesData?.pagination.hasMore ?? false;
  const discHasMore = disciplinaryData?.pagination.hasMore ?? false;

  const employeeIds = useMemo(
    () => [...new Set((disciplinaryData?.data ?? []).map((r) => r.employeeId))],
    [disciplinaryData?.data],
  );
  const { data: membersData } = useOrgMembersByIds(employeeIds);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    resetCasesToFirstPage();
  }, [resetCasesToFirstPage]);

  const handleCasesNextPage = useCallback(() => {
    casePagination.goToNextPage(casesData?.pagination.nextCursor);
  }, [casePagination, casesData]);

  const handleDisciplinaryNextPage = useCallback(() => {
    disciplinaryPagination.goToNextPage(disciplinaryData?.pagination.nextCursor);
  }, [disciplinaryPagination, disciplinaryData]);

  const caseColumns: DataTableColumn<HrCase>[] = [
    {
      key: "caseNumber",
      header: "Case #",
      cell: (row) => (
        <span className="font-mono text-xs font-medium text-primary">{row.caseNumber}</span>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => <CaseCategoryLabel category={row.category} />,
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => <CaseSeverityBadge severity={row.severity} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <CaseStatusBadge status={row.status} />,
    },
    {
      key: "summary",
      header: "Summary",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          <TruncatedText text={row.summary} className="text-sm" />
          {row.anonymous && (
            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Anon</Badge>
          )}
        </div>
      ),
    },
    {
      key: "age",
      header: "Age",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const filters = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search cases..."
        value={search}
        onValueChange={handleSearchChange}
        aria-label="Search cases"
      />
      <Select
        value={status || SENTINEL}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger
          aria-label="Filter by status"
          className={cn("w-[9.5rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={category || SENTINEL}
        onValueChange={handleCategoryChange}
      >
        <SelectTrigger
          aria-label="Filter by category"
          className={cn("w-[10rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={severity || SENTINEL}
        onValueChange={handleSeverityChange}
      >
        <SelectTrigger
          aria-label="Filter by severity"
          className={cn("w-[9rem]", FILTER_SELECT_TRIGGER)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {SEVERITY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Employee Relations & Cases"
      subtitle="Manage grievances, investigations, and disciplinary actions"
      filters={filters}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-sm"
            onClick={() => setShowAnonymous(true)}
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
              onClick={() => setShowNew(true)}
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
                columns={caseColumns}
                data={casesData?.data ?? []}
                isLoading={casesLoading}
                getRowKey={(row) => row.id}
                onRowClick={(row) => setSelectedCaseId(row.id)}
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
          <div className="flex flex-1 min-h-0 flex-col gap-4">
            {canManage && (
              <div className="flex justify-end">
                <AnimatedIconButton
                  icon={PlusIcon}
                  iconSize={14}
                  iconClassName="mr-1.5"
                  size="sm"
                  className="gap-1.5 text-sm"
                  onClick={() => setShowWarning(true)}
                >
                  Issue Action
                </AnimatedIconButton>
              </div>
            )}
            {discIsError ? (
              <ErrorState
                className="flex-1"
                title="Couldn't load disciplinary actions"
                description={getErrorMessage(discError)}
                onRetry={handleRetryDisciplinary}
              />
            ) : (
              <DataTable
                className="flex-1 min-h-0"
                columns={[
                  {
                    key: "employee",
                    header: "Employee",
                    cell: (row) => <span className="text-sm">{getUserDisplayName(memberById.get(row.employeeId))}</span>,
                  },
                  {
                    key: "actionType",
                    header: "Action",
                    cell: (row) => (
                      <span className="text-sm capitalize">{row.actionType.replace(/_/g, " ")}</span>
                    ),
                  },
                  {
                    key: "effectiveDate",
                    header: "Effective Date",
                    cell: (row) => (
                      <span className="text-xs text-muted-foreground">
                        {new Date(row.effectiveDate).toLocaleDateString()}
                      </span>
                    ),
                  },
                  {
                    key: "issuedBy",
                    header: "Issued By",
                    cell: (row) => <span className="font-mono text-xs">{row.issuedBy}</span>,
                  },
                ]}
                data={disciplinaryData?.data ?? []}
                isLoading={discLoading}
                getRowKey={(row) => row.id}
                emptyState={
                  <EmptyState
                    className="border-0 bg-transparent min-h-[40vh]"
                    illustration={<StateIllustration preset="security" className="h-28 w-28" />}
                    title="No disciplinary actions"
                    description="Formal disciplinary actions issued to employees will appear here."
                    action={canManage ? { label: "Issue Action", onClick: handleOpenIssueAction } : undefined}
                  />
                }
              />
            )}
            {!discIsError && (disciplinaryPagination.hasPrevious || discHasMore) ? (
              <CursorPageControls
                page={disciplinaryPagination.page}
                hasNext={discHasMore}
                onPrevious={disciplinaryPagination.goToPreviousPage}
                onNext={handleDisciplinaryNextPage}
              />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      {selectedCaseId !== null && (
        <CaseDetailSheet
          caseId={selectedCaseId}
          open={selectedCaseId !== null}
          onOpenChange={(v) => { if (!v) setSelectedCaseId(null); }}
        />
      )}

      <NewCaseSheet open={showNew} onOpenChange={setShowNew} />
      <AnonymousReportDialog open={showAnonymous} onOpenChange={setShowAnonymous} />
      <IssueWarningSheet open={showWarning} onOpenChange={setShowWarning} />
    </PageWrapper>
  );
}
