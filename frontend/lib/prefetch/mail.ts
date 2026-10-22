import "server-only";

import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { mailAccountsQueryOptions, mailMessagesQueryOptions } from "@/hooks/api/mail-read-options";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";
import { mailAccountListContract, mailListResponseContract } from "@/hooks/api/mail-schema";
import { mailListingSearchParams } from "@/lib/query-keys/directory-and-ownership";
import type { z } from "zod";

type MailAccountList = z.infer<typeof mailAccountListContract>;
type MailListResponse = z.infer<typeof mailListResponseContract>;

export async function prefetchMail() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("mail:inbox:view")) return dehydrate(await createServerQueryClient());

    const defaultListParams = { folder: "inbox", accountId: "all" } as const;
    await Promise.all([
      queryClient.prefetchQuery({
        ...mailAccountsQueryOptions,
        queryFn: () => serverGet<MailAccountList>("/mail/accounts", mailAccountListContract),
      }),
      queryClient.prefetchInfiniteQuery({
        ...mailMessagesQueryOptions(defaultListParams),
        queryFn: () =>
          serverGet<MailListResponse>(
            `/mail/messages?${mailListingSearchParams(defaultListParams).toString()}`,
            mailListResponseContract,
          ),
        initialPageParam: NO_CURSOR_YET,
      }),
    ]);

    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
