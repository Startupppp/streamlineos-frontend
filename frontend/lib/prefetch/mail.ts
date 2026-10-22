import "server-only";

import { dehydrate, QueryClient } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { serverGet } from "@/lib/server-fetch";
import { resolvePrefetchGate } from "@/lib/prefetch/prefetch-gate";
import { mailAccountsQueryOptions } from "@/hooks/api/mail-read-options";
import { mailAccountListContract } from "@/hooks/api/mail-schema";
import type { z } from "zod";

type MailAccountList = z.infer<typeof mailAccountListContract>;

export async function prefetchMailAccounts() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("mail:inbox:view")) return dehydrate(new QueryClient());

    await queryClient.prefetchQuery({
      ...mailAccountsQueryOptions,
      queryFn: () =>
        serverGet<MailAccountList>("/mail/accounts", mailAccountListContract),
    });

    return dehydrate(queryClient);
  } catch {
    return dehydrate(new QueryClient());
  }
}
