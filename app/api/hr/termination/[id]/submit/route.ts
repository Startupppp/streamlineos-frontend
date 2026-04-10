import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (session.user.role !== "HR" && session.user.role !== "CEO") {
      return err("Only HR can submit for CEO approval.", 403);
    }

    const { id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!existing) return err("Termination not found.", 404);
    if (existing.status !== "DRAFT") return err("Only draft terminations can be submitted.", 400);

    await db.update(terminations).set({
      status: "PENDING_CEO",
      updatedAt: new Date(),
    }).where(eq(terminations.id, terminationId));

    return ok({ success: true });
  });
}
