import { withAuth, withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTypes } from "@/lib/db/schema/hr";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getSessionAbility } from "@/lib/abilities-server";

const createSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  isMandatory: z.boolean().optional().default(true),
  applicableRoles: z.array(z.string()).optional().default([]),
  sortOrder: z.number().int().optional().default(0),
});

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const isAdmin =
      (await getSessionAbility()).can("manage", "hr:documents");

    const rows = await db
      .select()
      .from(documentTypes)
      .where(
        isAdmin
          ? eq(documentTypes.orgId, session.orgId)
          : and(
              eq(documentTypes.orgId, session.orgId),
              eq(documentTypes.isActive, true)
            )
      )
      .orderBy(asc(documentTypes.sortOrder), asc(documentTypes.name));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withAbility("manage", "hr:documents", async (session) => {
    const body = await parseBody(req, createSchema);

    const slug = toSlug(body.name);

    const existing = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.orgId, session.orgId),
        eq(documentTypes.slug, slug)
      ),
    });
    if (existing) return err("A document type with this name already exists.", 409);

    const [record] = await db
      .insert(documentTypes)
      .values({
        orgId: session.orgId,
        name: body.name,
        slug,
        description: body.description,
        isMandatory: body.isMandatory,
        applicableRoles: body.applicableRoles,
        sortOrder: body.sortOrder,
        isActive: true,
      })
      .returning();

    return ok(record, 201);
  });
}
