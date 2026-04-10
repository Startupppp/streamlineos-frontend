import { withAdmin, err, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { inngest } from "@/lib/inngest/client";
import type { NextRequest } from "next/server";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), internalNotes: z.string().optional() }),
  z.object({ action: z.literal("complete"), internalNotes: z.string().optional() }),
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAdmin(async (session) => {
    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!Number.isFinite(terminationId) || terminationId <= 0) return err("Invalid ID.", 400);

    const record = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!record) return err("Not found.", 404);

    const employee = await db.query.users.findFirst({
      where: eq(users.id, record.userId),
      columns: { id: true, name: true, email: true, designation: true, employeeId: true },
    });

    return ok({ ...record, employee });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAdmin(async (session) => {
    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!Number.isFinite(terminationId) || terminationId <= 0) return err("Invalid ID.", 400);

    const body = patchSchema.parse(await req.json());

    const record = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!record) return err("Not found.", 404);

    if (body.action === "submit") {
      if (record.status !== "DRAFT") return err("Only DRAFT terminations can be submitted.", 400);
      await db
        .update(terminations)
        .set({ status: "PENDING_CEO", updatedAt: new Date() })
        .where(eq(terminations.id, terminationId));

      const employee = await db.query.users.findFirst({
        where: eq(users.id, record.userId),
        columns: { name: true },
      });
      void inngest.send({
        name: "hr/termination.submitted",
        data: {
          terminationId,
          orgId: session.orgId,
          employeeName: employee?.name ?? "Employee",
        },
      });
    } else if (body.action === "complete") {
      if (record.status !== "SENT") return err("Only SENT terminations can be completed.", 400);
      await db
        .update(terminations)
        .set({ status: "COMPLETED", updatedAt: new Date() })
        .where(eq(terminations.id, terminationId));
    }

    return ok({ success: true });
  });
}
