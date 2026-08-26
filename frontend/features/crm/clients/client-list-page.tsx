"use client";

import { useCallback, useEffect, useState, useTransition, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { ErrorState } from "@/components/shared";
import {
  CONTENT_FILL_PANEL,
  FILTER_SELECT_TRIGGER,
  FILTER_TOOLBAR_ROW,
} from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { EmptyClientsIllustration } from "@/components/illustrations";
import { RecordList, type RecordValue } from "@/features/renderer";
import { DensityToggle, useDensity } from "@/features/renderer/density-toggle";
import { useTenantLayout } from "@/features/renderer/use-tenant-layout";
import { CLIENT_LAYOUT } from "@/lib/renderer/crm/client-layout";
import { useClientAccounts } from "@/hooks/api/crm/clients";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { clientRecords } from "./client-record";
import type { ClientAccountStatus } from "@/types/crm";

/**
 * Clients.
 *
 * Read-only, and the description says so — every field is marked read-only and
 * the form has no sections, so no create or edit surface can be generated from
 * it. The status labels and their tones now live in `CLIENT_LAYOUT` rather than
 * in two maps beside a hand-written column, so the list, the detail view and any
 * future surface agree on what "PLAN_SELECTED" is called and what colour it is.
 */

const PAGE_SIZE = 20;

const STATUS_OPTIONS: readonly ClientAccountStatus[] = [
  "ACCOUNT_OPENING",
  "QUERIES",
  "PLAN_SELECTED",
  "INVESTED",
];

function isStatus(value: string): value is ClientAccountStatus {
  return STATUS_OPTIONS.some((candidate) => candidate === value);
}

function ClientRowActions({ clientId, leadId }: { clientId: number; leadId: number }) {
  function handleStopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AnimatedIconButton
          icon={EllipsisIcon}
          variant="ghost"
          size="icon"
          className="w-7"
          onClick={handleStopPropagation}
          aria-label="Row actions"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/crm/clients/${clientId}`}>View details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/crm/leads/${leadId}`}>
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            View lead
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ClientListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const layout = useTenantLayout(CLIENT_LAYOUT);
  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);

  const statusParam = searchParams.get("status");
  const status = statusParam && isStatus(statusParam) ? statusParam : undefined;
  const page = Number(searchParams.get("page")) || 1;

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

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const { data, isLoading, isError, error, refetch, access} = useClientAccounts({
    search: debouncedSearch.trim() || undefined,
    status,
    page,
    limit: PAGE_SIZE,
  });

  const accounts = data?.accounts ?? [];
  const totalCount = data?.totalCount ?? 0;
  const isFiltered = !!debouncedSearch.trim() || !!status;

  const handleSearchChange = useCallback((value: string) => setSearch(value), []);

  const handleStatusChange = useCallback(
    (value: string) => updateParams({ status: value === "all" ? null : value, page: null }),
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    setSearch("");
    updateParams({ q: null, status: null, page: null });
  }, [updateParams]);

  const handlePageChange = useCallback(
    (next: number) => updateParams({ page: next > 1 ? String(next) : null }),
    [updateParams],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleRowClick = useCallback(
    (row: RecordValue) => router.push(`/crm/clients/${String(row.id)}`),
    [router],
  );

  const renderRowActions = useCallback(
    (row: RecordValue) => (
      <ClientRowActions clientId={Number(row.id)} leadId={Number(row.leadId)} />
    ),
    [],
  );

  const statusField = layout.fields.find((field) => field.name === "status");

  return (
    <PageWrapper
      title="Clients"
      subtitle="Accounts converted from a won lead"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder={layout.list.searchPlaceholder}
            value={search}
            onValueChange={handleSearchChange}
          />
          <Select value={status ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-fit min-w-40")} aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="all">All statuses</SelectItem>
              {statusField?.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DensityToggle density={density} onChange={setDensity} />
        </div>
      }
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {isLoading ? (
          <DataTableSkeleton rows={12} columns={layout.list.columns.length} className="flex-1" />
        ) : isError ? (
          <ErrorState
            title="Couldn't load clients"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : accounts.length === 0 ? (
          <EmptyState
            access={access}
            illustration={<EmptyClientsIllustration />}
            title={isFiltered ? "No clients match these filters" : "No clients yet"}
            description={
              isFiltered
                ? "Nothing matches the current search and status. Clear them to see every client."
                : "A client account is created when a lead converts. Win a lead and it will appear here."
            }
            action={isFiltered ? { label: "Clear filters", onClick: handleClearFilters } : undefined}
            actionVariant={isFiltered ? "outline" : undefined}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <RecordList
            layout={layout}
            rows={clientRecords(accounts)}
            getRowKey={(row) => String(row.id)}
            onRowClick={handleRowClick}
            actions={renderRowActions}
            density={density}
            money={money}
            minWidth="900px"
            className={CONTENT_FILL_PANEL}
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total: totalCount,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
}
