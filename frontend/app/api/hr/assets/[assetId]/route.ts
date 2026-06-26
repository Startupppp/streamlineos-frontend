import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assets, assetStatusEnum, users } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendAssetAssignedEmail } from "@/lib/email";

type AssetStatusEnum = (typeof assetStatusEnum.enumValues)[number];

const patchAssetSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.string().min(1).optional(),
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  serialNumber: z.string().min(3).max(100).optional(),
  assignedTo: z.string().nullable().optional(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"] as [AssetStatusEnum, ...AssetStatusEnum[]]).optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    if (!ability.can("manage", "hr:assets")) {
      return err("Only admins can update assets.", 403);
    }

    const { assetId: id } = await params;
    const assetId = Number(id);
    if (isNaN(assetId)) return err("Invalid asset ID.", 400);

    const body = await parseBody(req, patchAssetSchema);

    const existing = await db.query.assets.findFirst({
      where: and(eq(assets.id, assetId), eq(assets.orgId, session.orgId)),
      columns: { assignedTo: true, name: true, type: true, serialNumber: true },
    });

    if (!existing) return err("Asset not found.", 404);

    if (body.serialNumber !== undefined) {
      const duplicate = await db.query.assets.findFirst({
        where: and(
          eq(assets.orgId, session.orgId),
          ne(assets.id, assetId),
          sql`lower(trim(${assets.serialNumber})) = ${body.serialNumber.trim().toLowerCase()}`,
        ),
        columns: { id: true },
      });
      if (duplicate) return err("An asset with this serial number already exists.", 409);
    }

    const updatePayload: Partial<typeof assets.$inferInsert> = {};

    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.type !== undefined) updatePayload.type = body.type;
    if (body.brand !== undefined) updatePayload.brand = body.brand;
    if (body.model !== undefined) updatePayload.model = body.model;
    if (body.serialNumber !== undefined) updatePayload.serialNumber = body.serialNumber;
    if (body.assignedTo !== undefined) {
      updatePayload.assignedTo = body.assignedTo;
      updatePayload.status = body.assignedTo ? "ASSIGNED" : "AVAILABLE";
    }
    if (body.status !== undefined) updatePayload.status = body.status;
    if (body.purchaseDate !== undefined) updatePayload.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate).toISOString().split("T")[0] : undefined;
    if (body.purchaseCost !== undefined) updatePayload.purchaseCost = body.purchaseCost?.toString();
    if (body.location !== undefined) updatePayload.location = body.location;
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    updatePayload.updatedAt = new Date();

    await db
      .update(assets)
      .set(updatePayload)
      .where(and(eq(assets.id, assetId), eq(assets.orgId, session.orgId)));

    if (body.assignedTo && body.assignedTo !== existing.assignedTo) {
      void (async () => {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, body.assignedTo!),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendAssetAssignedEmail(
            employee.email,
            employee.name ?? "Employee",
            body.name ?? existing.name,
            body.type ?? existing.type,
            body.serialNumber ?? existing.serialNumber ?? null,
          );
        }
      })().catch(() => {});
    }

    return ok({ success: true });
  });
}
