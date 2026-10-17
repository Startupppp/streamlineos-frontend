"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanionPromptHistory } from "@/hooks/api/companion";
import { formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CompanionPrompt, CompanionPromptCategory } from "@/hooks/api/companion-schema";

const CATEGORY_LABEL = {
  meeting: "Meeting",
  clockIn: "Clock-in",
  break: "Break",
  friendly: "Check-in",
} as const;
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL);
const STATUS_OPTIONS = [
  "eligible",
  "claimed",
  "dismissed",
  "snoozed",
  "expired",
  "suppressed",
];

export function CompanionActivityList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("companionCategory");
  const requestedStatus = searchParams.get("companionOutcome");
  const category: CompanionPromptCategory | "all" = requestedCategory && requestedCategory in CATEGORY_LABEL
    ? requestedCategory as CompanionPromptCategory : "all";
  const status: CompanionPrompt["status"] | "all" = requestedStatus && STATUS_OPTIONS.includes(requestedStatus)
    ? requestedStatus as CompanionPrompt["status"] : "all";
  const pager = useCursorPager(`${category}|${status}`);
  const { data, error, isLoading, isError, isFetching, access, refetch } = useCompanionPromptHistory({
    ...(category !== "all" ? { category } : {}),
    ...(status !== "all" ? { status } : {}),
  }, pager.cursor);
  const items = data?.items ?? [];

  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "all") next.delete(name);
    else next.set(name, value);
    const query = next.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}#companion-activity`, { scroll: false });
  }

  function handleCategoryChange(value: string) {
    setFilter("companionCategory", value);
  }
  function handleStatusChange(value: string) {
    setFilter("companionOutcome", value);
  }
  function handleNext() {
    pager.goNext(data?.nextCursor);
  }
  function renderCategoryOption([value, label]: [string, string]) {
    return (
      <SelectItem key={value} value={value}>
        {label}
      </SelectItem>
    );
  }
  function renderStatusOption(value: string) {
    return (
      <SelectItem key={value} value={value}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </SelectItem>
    );
  }
  return (
    <div id="companion-activity" className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">
        Recent suggestions
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="companion-category-filter">Category</Label>
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger
              id="companion-category-filter"
              aria-label="Filter suggestion category"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_OPTIONS.map(renderCategoryOption)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="companion-status-filter">Outcome</Label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger
              id="companion-status-filter"
              aria-label="Filter suggestion outcome"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              {STATUS_OPTIONS.map(renderStatusOption)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {access.denied ? <p className="text-xs text-muted-foreground">AI access is unavailable for this account.</p> : null}
      {isLoading || access.pending ? (
        <p className="text-xs text-muted-foreground">
          Loading recent suggestions…
        </p>
      ) : null}
      {isError || access.unavailable ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="alert">
          <span>{error ? getErrorMessage(error) : "Recent suggestions couldn't be loaded."}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button>
        </div>
      ) : null}
      {data && !isError && !access.unavailable && items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {category === "all" && status === "all" ? "No suggestions yet." : "No suggestions match these filters."}
        </p>
      ) : null}
      {!isError && !access.unavailable && items.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {CATEGORY_LABEL[item.category]} · {item.status}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {item.status === "suppressed"
                  ? "Suppression reason"
                  : "Why it appeared"}
                : {item.reason}
              </span>
              <span className="text-xs text-muted-foreground">
                Source:{" "}
                {item.sourceRef
                  ? `${item.sourceRef.type} (${item.sourceRef.id})`
                  : "StreamlineOS"}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatDateTime(item.eligibleAt)}
              </span>
              {item.href ? (
                <Link
                  href={item.href}
                  className="w-fit text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  Open destination
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {data && !isError && !access.unavailable ? <TablePagination
        mode="cursor"
        rowCount={items.length}
        pageNumber={pager.pageNumber}
        hasMore={Boolean(data.nextCursor)}
        hasPrevious={pager.hasPrevious}
        onNext={handleNext}
        onPrevious={pager.goPrevious}
        disabled={isFetching}
        hideOnSinglePage
      /> : null}
    </div>
  );
}
