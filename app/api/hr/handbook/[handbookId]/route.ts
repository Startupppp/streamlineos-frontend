import { type NextRequest } from "next/server";
import { withAbility, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { handbookVersions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ handbookId: string }> };

const updateSchema = z.object({
  status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  changelog: z.string().max(2000).optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAbility("manage", "hr:handbook", async (session) => {
    const { handbookId } = await params;
    const id = Number(handbookId);
    if (!Number.isFinite(id)) return err("Invalid ID", 400);

    const existing = await db.query.handbookVersions.findFirst({
      where: and(eq(handbookVersions.id, id), eq(handbookVersions.orgId, session.orgId)),
      columns: { id: true, publishedAt: true },
    });
    if (!existing) return err("Handbook version not found", 404);

    const body = updateSchema.parse(await req.json());

    const updateData: { publishedAt?: Date | null; publishedBy?: string | null; changelog?: string } = {};

    if (body.status === "PUBLISHED") {
      updateData.publishedAt = new Date();
      updateData.publishedBy = session.user.id;
    } else if (body.status === "DRAFT") {
      updateData.publishedAt = null;
      updateData.publishedBy = null;
    }

    if (body.changelog !== undefined) {
      updateData.changelog = body.changelog;
    }

    await db
      .update(handbookVersions)
      .set(updateData)
      .where(and(eq(handbookVersions.id, id), eq(handbookVersions.orgId, session.orgId)));

    return ok({ success: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAbility("manage", "hr:handbook", async (session) => {
    const { handbookId } = await params;
    const id = Number(handbookId);
    if (!Number.isFinite(id)) return err("Invalid ID", 400);

    const existing = await db.query.handbookVersions.findFirst({
      where: and(eq(handbookVersions.id, id), eq(handbookVersions.orgId, session.orgId)),
      columns: { id: true, publishedAt: true },
    });
    if (!existing) return err("Handbook version not found", 404);

    if (existing.publishedAt) {
      return err("Cannot delete a published handbook version. Unpublish it first.", 409);
    }

    await db
      .delete(handbookVersions)
      .where(and(eq(handbookVersions.id, id), eq(handbookVersions.orgId, session.orgId)));

    return ok({ success: true });
  });
}
