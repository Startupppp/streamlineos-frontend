import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { getClientAccounts, backfillConvertedLeadsToClientAccounts, backfillCrmAssignments } from "@/server/queries/crm-clients";
import { z } from "zod";

const listSchema = z.object({
  status: z.enum(["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const filters = parseQuery(req, listSchema);

    try {
      await backfillConvertedLeadsToClientAccounts(session.orgId, session.user.id);
      await backfillCrmAssignments(session.orgId);
    } catch {
    }

    const data = await getClientAccounts(session.orgId, {
      ...filters,
      role: session.user.role ?? undefined,
      userId: session.user.id,
    });
    return ok(data);
  });
}
