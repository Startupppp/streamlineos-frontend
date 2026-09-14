"use client";

import { useCallback, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { MODULE_LABELS } from "@/components/rbac/permission-matrix-types";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useSimulateAccess,
  useSimulationCandidates,
  type SimulationCandidate,
} from "@/hooks/api/access/simulate";
import { useModuleGrantable } from "@/hooks/api/module-access/grantable";
import type { ExplainedPermission } from "@/hooks/api/roles-schema";
import { SimulatePersonPicker } from "./simulate-person-picker";
import { EffectiveAccessTable } from "./effective-access-table";
import {
  ModuleGrantabilityNote,
  ModuleStandingList,
  OrgStandingCard,
} from "./effective-access-standing";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useStartImpersonation } from "@/hooks/api/impersonation";
import { toast } from "sonner";

const ALL_MODULES = "all";
const DEFAULT_PAGE_SIZE = 25;

function matchesSearch(row: ExplainedPermission, needle: string): boolean {
  if (needle === "") return true;
  const lowered = needle.toLowerCase();
  return (
    row.permissionKey.toLowerCase().includes(lowered) ||
    row.sources.some((source) => source.label.toLowerCase().includes(lowered))
  );
}

function SimulateContent() {
  const [selectedPerson, setSelectedPerson] =
    useState<SimulationCandidate | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>(ALL_MODULES);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const debouncedPermissionSearch = useDebouncedValue(permissionSearch, 300);
  const candidatesQuery = useSimulationCandidates(candidateSearch);
  const accessQuery = useSimulateAccess(selectedPerson?.id);
  const grantableQuery = useModuleGrantable(
    moduleFilter === ALL_MODULES ? undefined : moduleFilter,
  );
  const canImpersonate = useCan("settings:impersonate:manage");
  const startImpersonation = useStartImpersonation();

  const candidates = useMemo(
    () => candidatesQuery.data?.data ?? [],
    [candidatesQuery.data],
  );

  const moduleOptions = useMemo(
    () =>
      (accessQuery.data?.moduleStandings ?? []).map((standing) => ({
        value: standing.moduleKey,
        label: MODULE_LABELS[standing.moduleKey] ?? standing.moduleKey,
      })),
    [accessQuery.data],
  );

  const rows = useMemo(() => {
    const provenance = accessQuery.data?.provenance ?? [];
    return provenance.filter(
      (row) =>
        (moduleFilter === ALL_MODULES || row.moduleKey === moduleFilter) &&
        matchesSearch(row, debouncedPermissionSearch),
    );
  }, [accessQuery.data, moduleFilter, debouncedPermissionSearch]);

  const handleSelectPerson = useCallback((candidate: SimulationCandidate) => {
    setSelectedPerson(candidate);
    setPickerOpen(false);
    setModuleFilter(ALL_MODULES);
    setPermissionSearch("");
  }, []);

  const handleClearPerson = useCallback(() => {
    setSelectedPerson(null);
    setModuleFilter(ALL_MODULES);
    setPermissionSearch("");
  }, []);

  const handleCandidateSearchChange = useCallback((value: string) => {
    setCandidateSearch(value);
  }, []);

  const handleModuleFilterChange = useCallback((value: string) => {
    setModuleFilter(value);
  }, []);

  const handlePermissionSearchChange = useCallback((value: string) => {
    setPermissionSearch(value);
  }, []);

  const handlePageSizeChange = useCallback((next: number) => {
    setPageSize(next);
  }, []);

  const handleRetry = useCallback(() => {
    void accessQuery.refetch();
  }, [accessQuery]);

  const handleLoginAs = useCallback(() => {
    if (!selectedPerson) return;
    startImpersonation.mutate(selectedPerson.id, {
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }, [selectedPerson, startImpersonation]);

  const access = accessQuery.data;
  const hasFilters =
    moduleFilter !== ALL_MODULES || debouncedPermissionSearch !== "";

  return (
    <PageWrapper
      title="Effective access"
      subtitle="What one person can actually do, where each right comes from, and when it ends."
      backHref="/settings/roles"
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      actions={
        canImpersonate && selectedPerson ? (
          <LoadingButton
            type="button"
            size="sm"
            isPending={startImpersonation.isPending}
            onClick={handleLoginAs}
          >
            Log in as {selectedPerson.name ?? selectedPerson.email}
          </LoadingButton>
        ) : undefined
      }
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SimulatePersonPicker
            selected={selectedPerson}
            candidates={candidates}
            search={candidateSearch}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onSearchChange={handleCandidateSearchChange}
            onSelect={handleSelectPerson}
            onClear={handleClearPerson}
          />
          {access ? (
            <>
              <SearchInput
                className="min-w-0 flex-1 lg:max-w-md"
                placeholder="Search permission or source…"
                value={permissionSearch}
                onValueChange={handlePermissionSearchChange}
              />
              <Select
                value={moduleFilter}
                onValueChange={handleModuleFilterChange}
              >
                <SelectTrigger
                  className={FILTER_SELECT_TRIGGER}
                  aria-label="Filter by module"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  <SelectItem value={ALL_MODULES}>All modules</SelectItem>
                  {moduleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : null}
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        {!selectedPerson ? (
          <EmptyState
            className="min-h-0 flex-1"
            title="No person selected"
            description="Pick a member above to see their organization standing, their standing in each module, and every effective permission with its source and expiry."
          />
        ) : accessQuery.isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load effective access"
            description={getErrorMessage(accessQuery.error)}
            onRetry={handleRetry}
          />
        ) : accessQuery.isLoading || !access ? (
          <EffectiveAccessSkeleton />
        ) : (
          <>
            <OrgStandingCard
              standing={access.standing}
              personName={selectedPerson.name ?? selectedPerson.email}
              permissionCount={access.provenance.length}
              isRefreshing={accessQuery.isFetching}
            />
            <ModuleStandingList moduleStandings={access.moduleStandings} />
            {moduleFilter === ALL_MODULES ? null : (
              <Card>
                <CardContent className="p-4">
                  <ModuleGrantabilityNote
                    moduleKey={moduleFilter}
                    grantable={grantableQuery.data}
                    isPending={grantableQuery.isLoading}
                    isError={grantableQuery.isError}
                  />
                </CardContent>
              </Card>
            )}
            <EffectiveAccessTable
              rows={rows}
              isLoading={false}
              hasFilters={hasFilters}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
            />
          </>
        )}
      </div>
    </PageWrapper>
  );
}

function EffectiveAccessSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full max-w-xl" />
          <Skeleton className="h-3 w-64" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-44" />
        </CardContent>
      </Card>
      <DataTableSkeleton rows={10} columns={5} />
    </div>
  );
}

export function SimulatePage() {
  return (
    <DashboardGate permission="settings:rbac:manage">
      <SimulateContent />
    </DashboardGate>
  );
}
