import { unstable_cache } from "next/cache";
import type { NextRequest } from "next/server";
import { withModuleAbility, parseQuery, ok, err } from "@/lib/api/helpers";
import { listCustomerLedgerQuerySchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag, entityScopedTag } from "@/lib/api/cache-tags";
import { buildCustomerLedger } from "@/lib/services/customer-ledger";
import type { CustomerLedger } from "@/types/accounting";

type Params = { params: Promise<{ clientId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { clientId: rawClientId } = await params;
  const clientId = Number(rawClientId);
  if (!Number.isInteger(clientId) || clientId <= 0) return err("Invalid client id", 400);

  return withModuleAbility("accounting", "read", "accounting:reports", async (session) => {
    const { from, to } = parseQuery(req, listCustomerLedgerQuerySchema);

    const entityTag = entityScopedTag(CacheTag.customerLedger, `${session.orgId}:${clientId}`);
    const orgTag = orgScopedTag(CacheTag.customerLedger, session.orgId);
    const fetcher = unstable_cache(
      (): Promise<CustomerLedger | null> =>
        buildCustomerLedger(session.orgId, clientId, { from, to }),
      [entityTag, `customer-ledger:${clientId}:${from ?? ""}:${to ?? ""}`, orgTag],
      { tags: [entityTag, orgTag], revalidate: 60 },
    );

    const result = await fetcher();
    if (!result) return err("Client not found", 404);
    return ok(result);
  });
}
