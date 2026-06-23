import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { invalidateCachePattern, CACHE_TTL, cached } from "@/lib/cache";
import { db } from "@/lib/db";
import { hiringFlows } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  return withAuth(async (session) => {
    const { flowId } = await params;
    const id = Number(flowId);
    if (isNaN(id)) return err("Invalid flow ID", 400);

    const key = `hr:hiring-flow:${session.orgId}:${id}`;
    const flow = await cached(
      key,
      () =>
        db.query.hiringFlows.findFirst({
          where: and(eq(hiringFlows.id, id), eq(hiringFlows.orgId, session.orgId)),
          with: { rounds: { orderBy: (r, { asc }) => [asc(r.orderIndex)] } },
        }),
      { ttlSeconds: CACHE_TTL.SHORT },
    );

    if (!flow) return err("Hiring flow not found", 404);
    return ok(flow);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  return withAuth(async (session) => {
    const { flowId } = await params;
    const id = Number(flowId);
    if (isNaN(id)) return err("Invalid flow ID", 400);

    const body = await parseBody(req, updateSchema);

    const existing = await db.query.hiringFlows.findFirst({
      where: and(eq(hiringFlows.id, id), eq(hiringFlows.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!existing) return err("Hiring flow not found", 404);

    if (body.isDefault) {
      await db
        .update(hiringFlows)
        .set({ isDefault: false })
        .where(and(eq(hiringFlows.orgId, session.orgId), eq(hiringFlows.isDefault, true)));
    }

    const [updated] = await db
      .update(hiringFlows)
      .set({
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      })
      .where(and(eq(hiringFlows.id, id), eq(hiringFlows.orgId, session.orgId)))
      .returning();

    await invalidateCachePattern(`hr:hiring-flows:list:${session.orgId}:*`);
    await invalidateCachePattern(`hr:hiring-flow:${session.orgId}:${id}`);
    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ flowId: string }> },
) {
  return withAuth(async (session) => {
    const { flowId } = await params;
    const id = Number(flowId);
    if (isNaN(id)) return err("Invalid flow ID", 400);

    const existing = await db.query.hiringFlows.findFirst({
      where: and(eq(hiringFlows.id, id), eq(hiringFlows.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!existing) return err("Hiring flow not found", 404);

    await db.delete(hiringFlows).where(and(eq(hiringFlows.id, id), eq(hiringFlows.orgId, session.orgId)));

    await invalidateCachePattern(`hr:hiring-flows:list:${session.orgId}:*`);
    await invalidateCachePattern(`hr:hiring-flow:${session.orgId}:${id}`);
    return ok({ success: true });
  });
}

export const dynamic = "force-dynamic";
