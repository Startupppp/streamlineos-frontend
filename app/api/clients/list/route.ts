import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";


export async function GET() {
  return withAuth(async (session) => {
    const rows = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.orgId, session.orgId))
      .orderBy(clients.name);
    return ok(rows);
  });
}
