import "server-only";

import { QueryClient } from "@tanstack/react-query";
import { getServerAuth } from "@/lib/get-server-auth";
import {
  UNAUTHENTICATED_SCOPE,
  authenticatedScope,
  scopedQueryKeyHashFn,
} from "@/lib/query-scope";

/**
 * The only way a prefetch factory should build a QueryClient.
 *
 * A plain `new QueryClient()` hashes keys with the default function, while the
 * app hashes them with the signed-in scope prefixed — so everything it
 * dehydrates lands in the client cache under a string the app never computes.
 * The entry is there, holding its data, and `getQueryData` on the identical key
 * returns undefined. Nothing fails: the page just refetches, exactly as it
 * would have without the prefetch.
 *
 * `getServerAuth` is React-cached per request, so calling this in several
 * factories on one page costs one session read.
 */
export async function createServerQueryClient(): Promise<QueryClient> {
  const session = await getServerAuth();
  const scope = session
    ? authenticatedScope(session.orgId, session.user?.id)
    : UNAUTHENTICATED_SCOPE;

  return new QueryClient({
    defaultOptions: { queries: { queryKeyHashFn: scopedQueryKeyHashFn(scope) } },
  });
}
