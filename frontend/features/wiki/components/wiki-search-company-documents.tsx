"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ErrorReference } from "@/components/shared/error-reference";
import { SourceBadge } from "@/components/shared/source-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCursorPager } from "@/components/ui/table-pagination";
import { useHrKbLinkFlags } from "@/hooks/api/kb/hr-link-config";
import { useLinkedDocuments, type LinkedDocumentItem } from "@/hooks/api/kb/linked-documents";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { companyDocumentHref } from "@/lib/knowledge-routes";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

const GROUP_LIMIT = 10;
// The server refuses a one-character search; asking would only produce an error the person did nothing to earn.
const MIN_QUERY_LENGTH = 2;

function DocumentRow({ item }: { item: LinkedDocumentItem }) {
  return (
    <li>
      <Link
        href={companyDocumentHref(item.id)}
        className="flex flex-col gap-1 rounded-md border border-border bg-background px-4 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{item.name ?? "Removed document"}</span>
          <SourceBadge kind="hr-document" />
        </div>
        <span className="text-xs text-muted-foreground">
          {[item.category, item.effectiveDate ? `Effective ${kbFormatDate(item.effectiveDate)}` : null, item.version === null ? null : `v${item.version}`]
            .filter((part) => part !== null)
            .join(" · ") || "Company document"}
        </span>
      </Link>
    </li>
  );
}

/**
 * Company documents that match a search, as a group of their own beside the page results. It has its own request
 * and its own cursor: two sources' cursors are never merged, so paging one cannot skip or repeat the other. The
 * group is absent while the tenant has not switched search on, absent for a query too short to send, and absent
 * when nothing matches, so a person is never shown a heading with nothing under it. What may be found is decided
 * by the server from the reader's audience; this only asks.
 */
export function WikiSearchCompanyDocuments({ query }: { query: string }) {
  const flags = useHrKbLinkFlags();
  const words = query.trim();
  const active = flags.search && words.length >= MIN_QUERY_LENGTH;
  const pager = useCursorPager(words);
  const { data, isError, error, refetch } = useLinkedDocuments({ q: words, cursor: pager.cursor, limit: GROUP_LIMIT }, { enabled: active });

  const handleNext = useCallback(() => pager.goNext(data?.pagination.nextCursor), [pager, data?.pagination.nextCursor]);
  const handlePrevious = useCallback(() => pager.goPrevious(), [pager]);
  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (!active) return null;
  // The switch was turned off after the page loaded: the feature is gone, not broken.
  if (isError && isApiError(error) && error.status === 404) return null;
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>Company documents could not be searched</AlertTitle>
        <AlertDescription>
          <p>{getErrorMessage(error)}</p>
          <ErrorReference error={error} className="mt-2 justify-start" />
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleRetry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (!data) return <Skeleton className="h-16 w-full" />;

  const rows = data.data;
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="wiki-search-company-documents" className="flex flex-col gap-2">
      <h2 id="wiki-search-company-documents" className="text-sm font-semibold text-foreground">
        Company documents
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((item) => (
          <DocumentRow key={item.id} item={item} />
        ))}
      </ul>
      {pager.hasPrevious || data.pagination.hasMore ? (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!pager.hasPrevious} onClick={handlePrevious}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!data.pagination.hasMore} onClick={handleNext}>
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}
