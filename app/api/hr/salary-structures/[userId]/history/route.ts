import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { salaryRevisionHistory } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth(async (session) => {
    const { userId } = await params;

    const isAdmin = isAdminOrOwner(session.user.role);
    if (!isAdmin && userId !== session.user.id) {
      return err("Not authorized.", 403);
    }
    if (!isAdmin) return err("Only admins can view salary revision history.", 403);

    const history = await db.query.salaryRevisionHistory.findMany({
      where: and(
        eq(salaryRevisionHistory.orgId, session.orgId),
        eq(salaryRevisionHistory.userId, userId)
      ),
      with: {
        changedByUser: { columns: { id: true, name: true } },
      },
      orderBy: [desc(salaryRevisionHistory.createdAt)],
    });

    return ok(history);
  });
}
