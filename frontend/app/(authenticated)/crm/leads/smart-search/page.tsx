"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { useNLSearch, type NLSearchLead } from "@/hooks/api/ai";

const EXAMPLE_QUERIES = [
  "Hot leads not yet contacted",
  "Qualified leads worth over 2L",
  "New leads from website this month",
  "Cold leads from Mumbai",
];

const STATUS_BADGE: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  CONTACTED: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  INTERESTED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  LOST: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const PRIORITY_BADGE: Record<string, string> = {
  HOT: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  WARM: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  COLD: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
};

function formatValue(val: number | null) {
  if (val === null) return "—";
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function capitalize(s: string | null) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function FilterBadges({ filters }: { filters: Record<string, unknown> }) {
  const entries = Object.entries(filters).filter(([, v]) => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });

  if (!entries.length) return null;

  const labelMap: Record<string, string> = {
    status: "Status",
    priority: "Priority",
    source: "Source",
    city: "City",
    minValue: "Min Value",
    maxValue: "Max Value",
    company: "Company",
    nameSearch: "Name",
    assignedToName: "Assigned To",
  };

  const format = (key: string, val: unknown): string => {
    if (key === "minValue" || key === "maxValue") return formatValue(Number(val));
    if (Array.isArray(val)) return (val as unknown[]).join(", ");
    return String(val);
  };

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <span className="text-dense text-muted-foreground font-medium">Interpreted as:</span>
      {entries.map(([key, val]) => (
        <Badge key={key} variant="outline" className="text-micro gap-1 h-5 px-2">
          <span className="text-muted-foreground">{labelMap[key] ?? key}:</span>
          <span className="font-medium">{format(key, val)}</span>
        </Badge>
      ))}
    </div>
  );
}

const COLUMNS: DataTableColumn<NLSearchLead>[] = [
  {
    key: "name",
    header: "Name",
    cell: (lead) => (
      <div className="min-w-0">
        <Link
          href={`/crm/leads/${lead.id}`}
          className="font-medium text-primary hover:underline transition-colors block truncate max-w-[160px]"
        >
          {lead.name}
        </Link>
        {lead.email && (
          <p className="text-micro text-muted-foreground mt-0.5 break-all">{lead.email}</p>
        )}
      </div>
    ),
    sortable: true,
    sortValue: (lead) => lead.name,
  },
  {
    key: "company",
    header: "Company",
    cell: (lead) => (
      <span className="text-muted-foreground block truncate max-w-[120px]">{lead.company ?? "—"}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (lead) => (
      <Badge
        variant="outline"
        className={cn("text-[9px] px-1.5 py-0 h-4", STATUS_BADGE[lead.status] ?? "")}
      >
        {capitalize(lead.status)}
      </Badge>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    cell: (lead) =>
      lead.priority ? (
        <Badge
          variant="outline"
          className={cn("text-[9px] px-1.5 py-0 h-4", PRIORITY_BADGE[lead.priority] ?? "")}
        >
          {capitalize(lead.priority)}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "value",
    header: "Value",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (lead) => formatValue(lead.value),
    sortable: true,
    sortValue: (lead) => lead.value ?? 0,
  },
  {
    key: "source",
    header: "Source",
    cell: (lead) => (
      <span className="text-muted-foreground capitalize">
        {lead.source ? lead.source.replace(/_/g, " ") : "—"}
      </span>
    ),
  },
  {
    key: "city",
    header: "City",
    cell: (lead) => (
      <span className="text-muted-foreground">{lead.city ?? "—"}</span>
    ),
  },
];

export default function SmartLeadSearchPage() {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, data, isPending, isError, reset } = useNLSearch();

  const handleSearch = useCallback(() => {
    const q = inputValue.trim();
    if (!q) return;
    mutate(q);
  }, [inputValue, mutate]);

  const handleChipClick = useCallback(
    (query: string) => {
      setInputValue(query);
      mutate(query);
    },
    [mutate],
  );

  const handleChipButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const q = e.currentTarget.dataset.query;
      if (q) handleChipClick(q);
    },
    [handleChipClick],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    reset();
    inputRef.current?.focus();
  }, [reset]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch],
  );

  const handleRetry = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  const hasResult = !!data;

  return (
    <PageWrapper
      title="Smart Lead Search"
      subtitle='Search leads using natural language — "hot leads from Mumbai above 5L"'
      badge={
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Sparkles className="h-3 w-3 text-primary" />
          AI-Powered
        </Badge>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <div className="space-y-3 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchInput
              ref={inputRef}
              className="flex-1"
              value={inputValue}
              onValueChange={handleInputChange}
              onClear={handleClear}
              onKeyDown={handleKeyDown}
              placeholder='Try: "hot leads from Mumbai with value above 5 lakhs"'
              aria-label="Natural language lead search"
            />
            <Button
              onClick={handleSearch}
              disabled={!inputValue.trim() || isPending}
              className="gap-1.5 w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                data-query={q}
                onClick={handleChipButtonClick}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                  "border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                  inputValue === q && "border-primary text-primary bg-primary/5",
                )}
              >
                <ArrowRight className="h-3 w-3" />
                {q}
              </button>
            ))}
          </div>
        </div>

        {isError ? (
          <ErrorState
            title="Search failed"
            description="Failed to complete the search. Please try again."
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : isPending ? (
          <DataTable
            data={[]}
            columns={COLUMNS}
            getRowKey={(lead) => lead.id}
            isLoading={true}
            minWidth="700px"
            className="flex-1 min-h-0"
          />
        ) : hasResult ? (
          <div className="flex flex-1 min-h-0 flex-col space-y-4">
            <FilterBadges filters={data.parsedFilters} />
            <p className="text-dense text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{data.total}</span>{" "}
              {data.total === 1 ? "result" : "results"} found
            </p>
            <DataTable
              data={data.leads}
              columns={COLUMNS}
              getRowKey={(lead) => lead.id}
              minWidth="700px"
              className="flex-1 min-h-0"
              emptyState={
                <EmptyState
                  illustration={<EmptyLeadsIllustration />}
                  title="No leads match your search"
                  description="Try adjusting your query or use different keywords."
                  className="border-0 bg-transparent"
                />
              }
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center gap-4">
            <div className="rounded-full bg-muted p-5">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base">Ask anything about your leads</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Use plain English to search leads by status, priority, city, value, source, and more.
              </p>
            </div>
            <div className="flex flex-col gap-2 items-start mt-2">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  data-query={q}
                  onClick={handleChipButtonClick}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
