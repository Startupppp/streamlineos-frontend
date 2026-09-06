"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CONTENT_FILL_PANEL,
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { EmptyActivityIllustration } from "@/components/illustrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { RecordList } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  AUDIT_ENTRY_LAYOUT,
  auditEntryFields,
} from "@/lib/renderer/crm/settings/audit-entry-layout";
import { useAuditLogs } from "@/hooks/api/audit-log";
import { useCan } from "@/hooks/api/access";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";

const PAGE_SIZE = 50;

const ENTITY_FILTERS = [
  { value: "all", label: "All Entities" },
  { value: "lead", label: "Leads" },
  { value: "contact", label: "Contacts" },
  { value: "company", label: "Companies" },
  { value: "deal", label: "Deals" },
  { value: "task", label: "Tasks" },
  { value: "settings", label: "Settings" },
];

const ACTION_FILTERS = [
  { value: "all", label: "All Actions" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "assigned", label: "Assigned" },
  { value: "status_changed", label: "Status Changed" },
  { value: "stage_changed", label: "Stage Changed" },
  { value: "converted", label: "Converted" },
  { value: "merged", label: "Merged" },
];

export default function CrmAuditLogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [density, setDensity] = useDensity();

  const layout = useTenantLayout(AUDIT_ENTRY_LAYOUT);
  const canViewAuditLog = useCan("audit-log:read");

  const entityType = searchParams.get("entityType") ?? "all";
  const action = searchParams.get("action") ?? "all";
  const fromDate = searchParams.get("from") ?? "";
  const toDate = searchParams.get("to") ?? "";

  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([
    undefined,
  ]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      setCursorHistory([undefined]);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const filters = useMemo(
    () => ({
      targetType: entityType !== "all" ? entityType : undefined,
      action: action !== "all" ? action : undefined,
      dateFrom: fromDate || undefined,
      dateTo: toDate || undefined,
      cursor: cursorHistory.at(-1),
      limit: PAGE_SIZE,
    }),
    [entityType, action, fromDate, toDate, cursorHistory],
  );

  const { data, isLoading, isError, refetch } = useAuditLogs(filters);
  const auditPagination = data?.pagination;

  const hasActiveFilters =
    entityType !== "all" || action !== "all" || !!fromDate || !!toDate;

  const handleEntityTypeChange = useCallback(
    (val: string) =>
      updateParams({ entityType: val !== "all" ? val : null, page: null }),
    [updateParams],
  );

  const handleActionChange = useCallback(
    (val: string) =>
      updateParams({ action: val !== "all" ? val : null, page: null }),
    [updateParams],
  );

  const handleFromDateChange = useCallback(
    (value: string) => updateParams({ from: value || null, page: null }),
    [updateParams],
  );

  const handleToDateChange = useCallback(
    (value: string) => updateParams({ to: value || null, page: null }),
    [updateParams],
  );

  const handleClearFilters = useCallback(
    () =>
      updateParams({
        entityType: null,
        action: null,
        from: null,
        to: null,
        page: null,
      }),
    [updateParams],
  );

  const handleCursorPrevious = useCallback(() => {
    setCursorHistory((prev) => prev.slice(0, -1));
  }, []);

  const handleCursorNext = useCallback(() => {
    if (auditPagination?.nextCursor) {
      setCursorHistory((prev) => [
        ...prev,
        auditPagination.nextCursor ?? undefined,
      ]);
    }
  }, [auditPagination]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const rows = useMemo(
    () => (data?.logs ?? []).map(auditEntryFields),
    [data?.logs],
  );

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Every change made to a CRM record, and who made it"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={entityType} onValueChange={handleEntityTypeChange}>
            <SelectTrigger
              className={`${FILTER_SELECT_TRIGGER} w-36`}
              aria-label="Entity type"
            >
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={handleActionChange}>
            <SelectTrigger
              className={`${FILTER_SELECT_TRIGGER} w-36`}
              aria-label="Action"
            >
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex shrink-0 items-center gap-1.5">
            <DatePicker
              value={fromDate}
              onChange={handleFromDateChange}
              placeholder="Pick a date"
              className="w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <DatePicker
              value={toDate}
              onChange={handleToDateChange}
              placeholder="Pick a date"
              className="w-36 text-xs"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleClearFilters}
            >
              Clear filters
            </Button>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <DensityToggle density={density} onChange={setDensity} />
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!canViewAuditLog ? (
          <NoPermissionState permission="audit-log:read" className="flex-1" />
        ) : isLoading ? (
          <DataTableSkeleton
            rows={12}
            columns={layout.list.columns.length}
            className="flex-1"
          />
        ) : isError ? (
          <ErrorState
            title="Couldn't load the audit log"
            description="The audit log didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyActivityIllustration />}
            title={
              hasActiveFilters
                ? "No entries match these filters"
                : "Nothing has been logged yet"
            }
            description={
              hasActiveFilters
                ? "Nothing was recorded that matches what you have filtered to. Clear the filters to see the whole log."
                : "Every create, edit, assignment and deletion in the CRM is recorded here as it happens."
            }
            action={
              hasActiveFilters
                ? { label: "Clear filters", onClick: handleClearFilters }
                : undefined
            }
            actionVariant={hasActiveFilters ? "outline" : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <>
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.id)}
              density={density}
              minWidth="1000px"
              className={CONTENT_FILL_PANEL}
              pagination={{ pageSize: PAGE_SIZE }}
            />
            {(cursorHistory.length > 1 || auditPagination?.hasMore) && (
              <CursorPageControls
                page={cursorHistory.length}
                hasNext={auditPagination?.hasMore ?? false}
                onPrevious={handleCursorPrevious}
                onNext={handleCursorNext}
              />
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
