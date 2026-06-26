import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { handbookVersions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ handbookId: string }> };

const updateSchema = z.object({
  status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  title: z.string().min(2).max(100).optional(),
  version: z.string().min(1).max(10).regex(/^\d+\.\d+$/, "Version must be in MAJOR.MINOR format (e.g., 1.0, 2.3)").optional(),
  documentUrl: z.string().url().optional().or(z.literal("")),
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

    const body = await parseBody(req, updateSchema);

    const updateData: {
      publishedAt?: Date | null;
      publishedBy?: string | null;
      changelog?: string;
      title?: string;
      version?: string;
      documentUrl?: string | null;
    } = {};

    if (body.status === "PUBLISHED") {
      updateData.publishedAt = new Date();
      updateData.publishedBy = session.user.id;
    } else if (body.status === "DRAFT") {
      updateData.publishedAt = null;
      updateData.publishedBy = null;
    }

    if (!existing.publishedAt) {
      if (body.title !== undefined) updateData.title = body.title;
      if (body.version !== undefined) updateData.version = body.version;
      if (body.documentUrl !== undefined) updateData.documentUrl = body.documentUrl || null;
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
