import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assets, assetStatusEnum, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { sendAssetAssignedEmail } from "@/lib/email";

type AssetStatusEnum = (typeof assetStatusEnum.enumValues)[number];

const patchAssetSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  serialNumber: z.string().optional(),
  assignedTo: z.string().optional(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"] as [AssetStatusEnum, ...AssetStatusEnum[]]).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

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

    const body = await parseBody(req, patchAssetSchema);

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

    // Fetch existing asset to check if assignee changed
    const existing = await db.query.assets.findFirst({
      where: and(eq(assets.id, assetId), eq(assets.orgId, session.orgId)),
      columns: { assignedTo: true, name: true, type: true, serialNumber: true },
    });

    await db
      .update(assets)
      .set(updatePayload)
      .where(
        and(eq(assets.id, assetId), eq(assets.orgId, session.orgId))
      );

    // Email the new assignee if asset was reassigned (non-blocking)
    if (body.assignedTo && body.assignedTo !== existing?.assignedTo) {
      void (async () => {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, body.assignedTo!),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendAssetAssignedEmail(
            employee.email,
            employee.name ?? "Employee",
            body.name ?? existing?.name ?? "Asset",
            body.type ?? existing?.type ?? "Equipment",
            body.serialNumber ?? existing?.serialNumber ?? null
          );
        }
      })().catch(() => {});
    }

    return ok({ success: true });
  });
}
