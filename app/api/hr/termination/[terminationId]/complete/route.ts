import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { terminations, users, fnfSettlements, assetReturns, assets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";
import { invalidateHrDashboardCache } from "@/lib/hr-cache";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ terminationId: string }> }
) {
  return withAuth(async (session) => {
    if (session.user.role !== "HR" && session.user.role !== "CEO") {
      return err("Only HR can complete terminations.", 403);
    }

    const { terminationId: id } = await params;
    const terminationId = Number(id);
    if (!terminationId) return err("Invalid ID.", 400);

    const existing = await db.query.terminations.findFirst({
      where: and(eq(terminations.id, terminationId), eq(terminations.orgId, session.orgId)),
    });
    if (!existing) return err("Termination not found.", 404);
    if (existing.status !== "SENT") return err("Termination letter must be sent first.", 400);

    await db.update(terminations).set({
      status: "COMPLETED",
      updatedAt: new Date(),
    }).where(eq(terminations.id, terminationId));

    await db.update(users).set({
      isActive: false,
    }).where(eq(users.id, existing.userId));

    await db.insert(fnfSettlements).values({
      orgId: session.orgId,
      userId: existing.userId,
      status: "DRAFT",
    }).onConflictDoNothing();

    const assignedAssets = await db.query.assets.findMany({
      where: and(
        eq(assets.orgId, session.orgId),
        eq(assets.assignedTo, existing.userId),
        eq(assets.status, "ASSIGNED")
      ),
    });

    if (assignedAssets.length > 0) {
      await db.insert(assetReturns).values(
        assignedAssets.map((asset) => ({
          orgId: session.orgId,
          userId: existing.userId,
          assetId: asset.id,
          assetName: asset.name,
          status: "PENDING",
        }))
      );
    }

    // Invalidate HR dashboard caches so headcount reflects immediately
    await invalidateHrDashboardCache(session.orgId);

    void writeAuditLog({
      action: "TERMINATION_COMPLETED",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(terminationId),
      targetType: "termination",
      metadata: {
        employeeId: existing.userId,
        userDeactivated: true,
        fnfInitiated: true,
        assetsToReturn: assignedAssets.length,
      },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
