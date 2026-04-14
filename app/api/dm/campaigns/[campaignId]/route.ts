import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmCampaigns } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["active", "paused", "completed"]).optional(),
  budgetAllocated: z.string().optional(),
  budgetSpent: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { campaignId } = await params;
      const id = Number(campaignId);
      if (!Number.isFinite(id)) return err("Invalid ID", 400);

      const body = await req.json();
      const data = updateSchema.parse(body);

      const [updated] = await db
        .update(crmCampaigns)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(crmCampaigns.id, id), eq(crmCampaigns.orgId, session.orgId)))
        .returning();

      if (!updated) return err("Campaign not found", 404);
      return ok(updated);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update campaign",
        500
      );
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { campaignId } = await params;
      const id = Number(campaignId);
      if (!Number.isFinite(id)) return err("Invalid ID", 400);

      const [deleted] = await db
        .delete(crmCampaigns)
        .where(and(eq(crmCampaigns.id, id), eq(crmCampaigns.orgId, session.orgId)))
        .returning();

      if (!deleted) return err("Campaign not found", 404);
      return ok({ success: true });
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to delete campaign",
        500
      );
    }
  });
}
