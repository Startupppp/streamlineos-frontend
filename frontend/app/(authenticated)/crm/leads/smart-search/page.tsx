"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { useLeadLayout } from "@/features/crm/leads/use-lead-layout";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { DensityToggle, useDensity } from "@/components/renderer/density-toggle";
import { useNLSearch, type NLSearchLead } from "@/hooks/api/ai";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { withColumns } from "@/lib/renderer/layout-adjustment";
import { cn } from "@/lib/utils";

/**
 * Leads, asked for in a sentence.
 *
 * The table this replaced was a third hand-written `DataTableColumn[]` over the
 * same record, with its own `STATUS_BADGE` and `PRIORITY_BADGE` maps and its own
 * `formatValue` that printed a hardcoded rupee sign in lakhs and crores — so an
 * organisation billing in dirhams was told its pipeline was worth ₹4.2L. The
 * columns, the badges and the currency now come from the shared description and
 * the organisation's own display settings.
 *
 * What is genuinely this screen's own is the query box, the worked examples and
 * the read-back of how the sentence was interpreted, which is the part that
 * makes a natural-language search trustworthy rather than magic.
 */

const EXAMPLE_QUERIES = [
  "Hot leads not yet contacted",
  "Qualified leads worth over 2L",
  "New leads from website this month",
  "Cold leads from Mumbai",
];

const COLUMNS = [
  "name",
  "email",
  "status",
  "priority",
  "potentialValue",
  "source",
  "city",
] as const;

const FILTER_LABELS: Record<string, string> = {
  status: "Status",
  priority: "Priority",
  source: "Source",
  city: "City",
  minValue: "Min value",
  maxValue: "Max value",
  company: "Company",
  nameSearch: "Name",
  assignedToName: "Assigned to",
};

/**
 * The search result in the shape the description names.
 *
 * The endpoint calls the money `value` and sends the owner as a flat `assignedTo`
 * string; `LEAD_LAYOUT` calls them `potentialValue` and `assignedToName`,
 * because that is what the lead endpoint sends everywhere else. Renaming them
 * here is what lets one description drive this table too, instead of a second
 * one that agrees with it until somebody edits one of them.
 */
function toSearchRecords(leads: readonly NLSearchLead[]): RecordValue[] {
  return asRecordValues(
    leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      status: lead.status,
      priority: lead.priority,
      source: lead.source,
      city: lead.city,
      potentialValue: lead.value,
      assignedToName: lead.assignedTo,
    })),
  );
}

function FilterBadges({
  filters,
  money,
}: {
  filters: Record<string, unknown>;
  money: MoneyDisplay;
}) {
  const entries = Object.entries(filters).filter(([, value]) => {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });

  if (entries.length === 0) return null;

  const format = (key: string, value: unknown): string => {
    if (key === "minValue" || key === "maxValue") return formatMoney(Number(value), money);
    if (Array.isArray(value)) return (value as unknown[]).join(", ");
    return String(value);
  };

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <span className="text-dense font-medium text-muted-foreground">Interpreted as:</span>
      {entries.map(([key, value]) => (
        <Badge key={key} variant="outline" className="h-5 gap-1 px-2 text-micro">
          <span className="text-muted-foreground">{FILTER_LABELS[key] ?? key}:</span>
          <span className="font-medium">{format(key, value)}</span>
        </Badge>
      ))}
    </div>
  );
}

export default function SmartLeadSearchPage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, data, isPending, isError, reset } = useNLSearch();

  const leadLayout = useLeadLayout();
  const layout = useMemo(() => withColumns(leadLayout, COLUMNS), [leadLayout]);
  const money = useOrgDisplay();
  const [density, setDensity] = useDensity();

  const rows = useMemo(() => toSearchRecords(data?.leads ?? []), [data]);

  const handleSearch = useCallback(() => {
    const query = inputValue.trim();
    if (!query) return;
    mutate(query);
  }, [inputValue, mutate]);

  const handleChipClick = useCallback(
    (query: string) => {
      setInputValue(query);
      mutate(query);
    },
    [mutate],
  );

  const handleChipButtonClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const query = event.currentTarget.dataset.query;
      if (query) handleChipClick(query);
    },
    [handleChipClick],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    reset();
    inputRef.current?.focus();
  }, [reset]);

  const handleInputChange = useCallback((value: string) => setInputValue(value), []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") handleSearch();
    },
    [handleSearch],
  );

  const handleRowClick = useCallback(
    (row: RecordValue) => router.push(`/crm/leads/${String(row.id)}`),
    [router],
  );

  const hasResult = !!data;

  return (
    <PageWrapper
      title="Smart lead search"
      subtitle='Search leads using natural language — "hot leads from Mumbai above 5L"'
      badge={
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Sparkles className="h-3 w-3 text-primary" />
          AI-powered
        </Badge>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
          <div className="flex flex-col gap-2 sm:flex-row">
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
              className="w-full gap-1.5 sm:w-auto"
            >
              {isPending ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                  Searching…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Search
                </>
              )}
            </Button>
            {hasResult ? <DensityToggle density={density} onChange={setDensity} /> : null}
          </div>

          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            {EXAMPLE_QUERIES.map((query) => (
              <button
                key={query}
                type="button"
                data-query={query}
                onClick={handleChipButtonClick}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                  "border-border text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary",
                  inputValue === query && "border-primary bg-primary/5 text-primary",
                )}
              >
                <ArrowRight className="h-3 w-3" />
                {query}
              </button>
            ))}
          </div>
        </div>

        {isError ? (
          <ErrorState
            title="Search failed"
            description="The search didn't complete. Check your connection and try again."
            onRetry={handleSearch}
            className={CONTENT_FILL_PANEL}
          />
        ) : isPending ? (
          <DataTableSkeleton rows={10} columns={layout.list.columns.length} className="flex-1" />
        ) : !hasResult ? (
          /*
            Not one of the four empty states, and deliberately not dressed as
            one: nothing is missing and nothing failed — no question has been
            asked yet. Telling somebody "no leads found" before they have
            searched would be the product answering a question nobody put to it.
          */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-full bg-muted p-5">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold">Ask anything about your leads</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Use plain English to search leads by status, priority, city, value, source, and
                more.
              </p>
            </div>
            <div className="mt-2 flex flex-col items-start gap-2">
              {EXAMPLE_QUERIES.map((query) => (
                <button
                  key={query}
                  type="button"
                  data-query={query}
                  onClick={handleChipButtonClick}
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            illustration={<EmptyLeadsIllustration />}
            title="No leads match your search"
            description={`Nothing came back for "${data.query}". Try describing the lead differently, or widen the range.`}
            action={{ label: "Clear search", onClick: handleClear }}
            actionVariant="outline"
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <FilterBadges filters={data.parsedFilters} money={money} />
            <p className="text-dense text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{data.total}</span>{" "}
              {data.total === 1 ? "result" : "results"} found
            </p>
            <RecordList
              layout={layout}
              rows={rows}
              getRowKey={(row) => String(row.id)}
              onRowClick={handleRowClick}
              density={density}
              money={money}
              minWidth="960px"
              className={CONTENT_FILL_PANEL}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
