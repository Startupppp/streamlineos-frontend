import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assets, assetStatusEnum } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";

type AssetStatusEnum = (typeof assetStatusEnum.enumValues)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update assets.", 403);
    }

    const { assetId: id } = await params;
    const assetId = Number(id);
    if (isNaN(assetId)) return err("Invalid asset ID.", 400);

    const body = await req.json() as {
      name?: string;
      type?: string;
      serialNumber?: string;
      assignedTo?: string;
      status?: AssetStatusEnum;
      location?: string;
      notes?: string;
    };

    const updatePayload: Partial<typeof assets.$inferInsert> = {};

    if (body.name) updatePayload.name = body.name;
    if (body.type) updatePayload.type = body.type;
    if (body.serialNumber !== undefined) updatePayload.serialNumber = body.serialNumber;
    if (body.assignedTo !== undefined) {
      updatePayload.assignedTo = body.assignedTo;
      updatePayload.status = body.assignedTo ? "ASSIGNED" : "AVAILABLE";
    }
    if (body.status) updatePayload.status = body.status;
    if (body.location !== undefined) updatePayload.location = body.location;
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    updatePayload.updatedAt = new Date();

    await db
      .update(assets)
      .set(updatePayload)
      .where(
        and(eq(assets.id, assetId), eq(assets.orgId, session.orgId))
      );

    return ok({ success: true });
  });
}
