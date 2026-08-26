"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTableSkeleton } from "@/components/ui/data-table";
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
import { ErrorState, NoPermissionState } from "@/components/shared";
import { RecordList } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import {
  AUDIT_ENTRY_LAYOUT,
  auditEntryFields,
} from "@/lib/renderer/crm/settings/audit-entry-layout";
import { useAuditLogs } from "@/hooks/api/audit-log";
import { useCan } from "@/hooks/api/access";

/**
 * The CRM audit log.
 *
 * A record list, which is what it always was. The surface this replaces drew a
 * timeline — avatar bubbles joined by a vertical rule, one card per entry, the
 * action and the entity restated in prose under badges that already said them —
 * and a timeline is read downward about one thing. An audit log is read across
 * about many: who, what, which record, when. Those are columns, and columns are
 * what `AUDIT_ENTRY_LAYOUT` describes.
 *
 * Fifty entries used to fill four screens. They now fill one, which matters
 * because the reason anybody opens this page is to find one entry among
 * thousands.
 *
 * The page also stops pretending a query in flight is an empty log: the loading
 * branch is a skeleton shaped like the table, and the empty branch says whether
 * the filters hid everything or nothing has happened yet.
 */

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
  const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
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
      page,
      pageSize: PAGE_SIZE,
    }),
    [entityType, action, fromDate, toDate, page],
  );

  const { data, isLoading, isError, refetch } = useAuditLogs(filters);

  const hasActiveFilters = entityType !== "all" || action !== "all" || !!fromDate || !!toDate;

  const handleEntityTypeChange = useCallback(
    (val: string) => updateParams({ entityType: val !== "all" ? val : null, page: null }),
    [updateParams],
  );

  const handleActionChange = useCallback(
    (val: string) => updateParams({ action: val !== "all" ? val : null, page: null }),
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
    () => updateParams({ entityType: null, action: null, from: null, to: null, page: null }),
    [updateParams],
  );

  const handlePageChange = useCallback(
    (next: number) => updateParams({ page: next > 1 ? String(next) : null }),
    [updateParams],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const rows = useMemo(() => (data?.logs ?? []).map(auditEntryFields), [data?.logs]);

  return (
    <PageWrapper
      title="Audit Log"
      subtitle="Every change made to a CRM record, and who made it"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={entityType} onValueChange={handleEntityTypeChange}>
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-36`} aria-label="Entity type">
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
            <SelectTrigger className={`${FILTER_SELECT_TRIGGER} w-36`} aria-label="Action">
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
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleClearFilters}>
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
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
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
            title={hasActiveFilters ? "No entries match these filters" : "Nothing has been logged yet"}
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
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            density={density}
            minWidth="1000px"
            className={CONTENT_FILL_PANEL}
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
}
