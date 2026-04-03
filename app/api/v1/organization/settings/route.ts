import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getOrgSettings } from "@/server/queries/organization";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getOrgSettings(session.orgId);
      if (!data) return err("Organization not found", 404);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load organization settings",
        500
      );
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Forbidden", 403);
      }

      const body = await req.json();
      const input = updateSchema.parse(body);

      if (input.slug) {
        const existing = await db.query.organizations.findFirst({
          where: and(
            eq(organizations.slug, input.slug),
            eq(organizations.id, session.orgId)
          ),
        });
        if (!existing) {
          const slugTaken = await db.query.organizations.findFirst({
            where: eq(organizations.slug, input.slug),
          });
          if (slugTaken) return err("Slug already in use", 409);
        }
      }

      const updateData: Record<string, string> = {};
      if (input.name) updateData.name = input.name;
      if (input.slug) updateData.slug = input.slug;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(organizations)
          .set(updateData)
          .where(eq(organizations.id, session.orgId));
      }

      await createAuditLog({
        action: "settings.updated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: session.orgId,
        targetType: "organization",
        metadata: updateData,
      });

      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update organization settings",
        500
      );
    }
  });
}
