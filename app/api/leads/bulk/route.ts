import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

const bulkUpdateSchema = z.object({
  leadIds: z.array(z.number()).min(1),
  update: z.object({
    status: z.enum(["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]).optional(),
    priority: z.enum(["HOT", "WARM", "COLD"]).optional(),
    assignedToId: z.string().optional(),
  }),
});

const bulkDeleteSchema = z.object({
  leadIds: z.array(z.number()).min(1),
});

export async function PATCH(req: NextRequest) {
  return withAbility("update", "crm:leads", async (session) => {
    const input = await parseBody(req, bulkUpdateSchema);
    const { leadIds, update } = input;
    const setData: Record<string, unknown> = { updatedAt: new Date() };

    if (update.status) setData.status = update.status;
    if (update.priority) setData.priority = update.priority;
    if (update.assignedToId) {
      setData.assignedToId = update.assignedToId;
      setData.assignedAt = new Date();
      setData.assignedById = session.user.id;
    }

    await db.update(leads)
      .set(setData)
      .where(and(eq(leads.orgId, session.orgId!), inArray(leads.id, leadIds)));

    return ok({ updated: leadIds.length });
  });
}

export async function DELETE(req: NextRequest) {
  return withAbility("delete", "crm:leads", async (session) => {
    const input = await parseBody(req, bulkDeleteSchema);

    await db.delete(leads)
      .where(and(eq(leads.orgId, session.orgId!), inArray(leads.id, input.leadIds)));

    return ok({ deleted: input.leadIds.length });
  });
}
