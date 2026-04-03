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

    const updatePayload: Parameters<typeof db.update>[0] extends never
      ? never
      : Record<string, unknown> = {};

    if (body.name) updatePayload.name = body.name;
    if (body.type) updatePayload.type = body.type;
    if (body.serialNumber !== undefined) updatePayload.serialNumber = body.serialNumber;
    if (body.assignedTo !== undefined) {
      updatePayload.assignedTo = body.assignedTo;
      updatePayload.status = (body.assignedTo ? "ASSIGNED" : "AVAILABLE") as AssetStatusEnum;
    }
    if (body.status) updatePayload.status = body.status;
    if (body.location !== undefined) updatePayload.location = body.location;
    if (body.notes !== undefined) updatePayload.notes = body.notes;
    updatePayload.updatedAt = new Date();

    await db
      .update(assets)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updatePayload as any)
      .where(
        and(eq(assets.id, assetId), eq(assets.orgId, session.orgId))
      );

    return ok({ success: true });
  });
}
