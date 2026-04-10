import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clientAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** GET /api/clients/renewals — all client accounts with renewal fields */
export async function GET() {
  return withAuth(async (session) => {
    const accounts = await db.query.clientAccounts.findMany({
      where: eq(clientAccounts.orgId, session.orgId),
      with: {
        salesRep: { columns: { id: true, name: true } },
      },
      orderBy: (t, { asc }) => [asc(t.clientName)],
    });
    return ok(accounts);
  });
}
