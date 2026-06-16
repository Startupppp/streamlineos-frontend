import { withAuth, ok, err } from "@/lib/api/helpers";
import { getSessionAbility } from "@/lib/abilities-server";
import { db } from "@/lib/db";
import { terminations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (session.user.role !== "HR" && session.user.role !== "CEO" && !ability.can("manage", "hr:employees")) {
      return err("Forbidden", 403);
    }

    const { terminationId: rawId } = await params;
    const terminationId = Number(rawId);
    if (!terminationId) return err("Invalid ID.", 400);

    const data = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
      with: { user: true, initiator: true, ceoReviewer: true },
    });
    if (!data) return err("Termination not found.", 404);

    return ok(data);
  });
}
