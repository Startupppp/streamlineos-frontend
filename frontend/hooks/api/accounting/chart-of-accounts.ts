"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { toQuery, type CursorPage } from "@/hooks/api/accounting/cursor-page";
import type { Account, AccountType } from "@/types/accounting";

export interface ListAccountsParams {
  cursor?: string;
  limit?: number;
  q?: string;
  type?: AccountType;
  activeOnly?: boolean;
}

/**
 * One page of the chart of accounts, cursor-paged exactly as the endpoint
 * serves it. The nine selector surfaces that used to call this now call
 * `useAllAccounts`, so at the time of writing its only consumer is the spec that
 * pins the 100-row ceiling. It stays as the paged primitive `useAllAccounts` is
 * defined against — the route is live and published in the contract, and a
 * future paginated chart-of-accounts list is the shape that wants it. Deleting
 * it would also delete the evidence of where the ceiling actually is.
 */
export function useAccounts(params: ListAccountsParams = {}) {
  return useGatedQuery<CursorPage<Account>, Error>("accounting:accounts:read", {
    queryKey: queryKeys.accounting.accounts(params),
    queryFn: ({ signal }) =>
      apiClient.get<CursorPage<Account>>("/accounting/accounts", toQuery(params), signal),
    staleTime: 60_000,
  });
}

/**
 * `GET /accounting/accounts` serves at most 100 rows per request —
 * `pageSizeField(20, 100)` against the platform's `PAGE_SIZE_CAP`, and the
 * field CLAMPS instead of rejecting, so asking for 200 is answered with 100 and
 * no error. A selector that reads one page and drops `pagination.nextCursor`
 * therefore makes accounts 101+ unselectable, with nothing on screen saying the
 * list was cut. `AccountDetailPage` had the sharper version of the same bug: it
 * resolves an account by scanning that one page, so account 101 rendered as
 * "Account not found" while its row sat in the chart of accounts.
 *
 * A chart of accounts is a bounded reference set the whole form depends on, so
 * this follows the cursor to the end rather than paginating a dropdown. The
 * return shape is the endpoint's own `CursorPage`, which is what lets a call
 * site swap `useAccounts` for this and change nothing else, and `pagination`
 * stays honest about the aggregate:
 *   `limit`      the row ceiling this hook will fetch,
 *   `hasMore`    true only if that ceiling cut the chart short,
 *   `nextCursor` where a caller would resume if it did.
 */
const ACCOUNT_PAGE_SIZE = 100;
/** 20 pages -> 2,000 accounts: 20x the single-page ceiling, and a hard stop on a pathological chart. */
const MAX_ACCOUNT_PAGES = 20;

export function useAllAccounts(
  params: Omit<ListAccountsParams, "cursor" | "limit"> = {},
) {
  return useGatedQuery<CursorPage<Account>, Error>("accounting:accounts:read", {
    queryKey: queryKeys.accounting.accounts({ ...params, complete: true }),
    queryFn: async ({ signal }) => {
      const rows: Account[] = [];
      let cursor: string | undefined = undefined;
      let nextCursor: string | null = null;
      let hasMore = false;
      let pages = 0;

      do {
        const page: CursorPage<Account> = await apiClient.get<CursorPage<Account>>(
          "/accounting/accounts",
          toQuery({ ...params, limit: ACCOUNT_PAGE_SIZE, cursor }),
          signal,
        );
        rows.push(...page.data);
        pages += 1;
        hasMore = page.pagination.hasMore;
        nextCursor = page.pagination.nextCursor;
        cursor = nextCursor ?? undefined;
      } while (hasMore && cursor !== undefined && pages < MAX_ACCOUNT_PAGES);

      const truncated = hasMore && cursor !== undefined;
      return {
        data: rows,
        pagination: {
          limit: ACCOUNT_PAGE_SIZE * MAX_ACCOUNT_PAGES,
          hasMore: truncated,
          nextCursor: truncated ? nextCursor : null,
        },
      };
    },
    staleTime: 60_000,
  });
}

interface CreateAccountInput {
  code: string;
  name: string;
  accountType: AccountType;
  description?: string;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Account, Error, CreateAccountInput>("accounting:accounts:create", {
    mutationKey: ["create", "account"],
    mutationFn: (data) => apiClient.post<Account>("/accounting/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

interface UpdateAccountInput {
  name?: string;
  isActive?: boolean;
  description?: string;
}

export function useUpdateAccount(accountId: number) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<Account, Error, UpdateAccountInput>("accounting:accounts:update", {
    mutationKey: ["update", "account"],
    mutationFn: (data) => apiClient.patch<Account>(`/accounting/accounts/${accountId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

