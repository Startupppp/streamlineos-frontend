import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getClientAccounts, backfillConvertedLeadsToClientAccounts, backfillCrmAssignments } from "@/server/queries/crm-clients";
import { redis, isRedisEnabled } from "@/lib/redis";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
});

async function tryBackfill(orgId: string, userId: string) {
  const lockKey = `clients:backfill:${orgId}`;
  if (isRedisEnabled() && redis) {
    try {
      const acquired = await redis.set(lockKey, "1", { ex: 60, nx: true });
      if (!acquired) return;
    } catch {
      // Redis unavailable — fall through and run the backfill anyway
    }
  }
  try {
    await backfillConvertedLeadsToClientAccounts(orgId, userId);
    await backfillCrmAssignments(orgId);
  } catch {
  }
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);

    void tryBackfill(session.orgId, session.user.id);

    const data = await getClientAccounts(session.orgId, {
      ...filters,
      role: session.user.role ?? undefined,
      userId: session.user.id,
    });
    return ok(data);
  });
}
