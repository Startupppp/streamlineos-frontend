"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Account } from "@/types/accounting";
import type { CursorPage } from "@/hooks/api/accounting";

/**
 * Says why an account selector is short.
 *
 * An account `<Select>` fed by `accountsQuery.data?.data ?? []` renders the
 * same empty dropdown whether the chart of accounts is genuinely empty, the
 * read 500'd, or the chart ran past what one fetch will carry. Those are three
 * different facts and only one of them is about the org's books, so this sits
 * under the field and names the one that actually happened.
 *
 * It takes the query rather than booleans so a call site cannot wire up half of
 * it — the read's failure and its truncation flag travel together.
 */
interface AccountListNoticeQuery {
  isError: boolean;
  error: Error | null;
  data: CursorPage<Account> | undefined;
  refetch: () => unknown;
}

interface AccountListNoticeProps {
  query: AccountListNoticeQuery;
  className?: string;
}

export function AccountListNotice({ query, className }: AccountListNoticeProps) {
  function handleRetry(): void {
    void query.refetch();
  }

  if (query.isError)
    return (
      <p className={className ? `text-xs text-destructive ${className}` : "text-xs text-destructive"} role="alert">
        Couldn&apos;t load accounts: {getErrorMessage(query.error)}{" "}
        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleRetry}>
          Try again
        </Button>
      </p>
    );

  const pagination = query.data?.pagination;
  if (pagination?.hasMore)
    return (
      <p
        className={
          className ? `text-xs text-muted-foreground ${className}` : "text-xs text-muted-foreground"
        }
        role="status"
      >
        Showing the first {pagination.limit.toLocaleString("en-IN")} accounts — this list is
        truncated.
      </p>
    );

  return null;
}
