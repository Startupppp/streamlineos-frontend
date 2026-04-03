import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getBranch } from "@/server/queries/branches";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  branchManagerId: z.string().optional(),
  branchHrId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const branch = await getBranch(session.orgId, branchId);
      if (!branch) return err("Branch not found", 404);
      return ok(branch);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load branch",
        500
      );
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (!["HR", "CEO"].includes(role)) {
        return err("Forbidden", 403);
      }

      const { branchId: id } = await params;
      const branchId = Number(id);
      if (!Number.isFinite(branchId)) return err("Invalid ID", 400);

      const body = await req.json();
      const data = updateSchema.parse(body);

      const [updated] = await db
        .update(branches)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(eq(branches.id, branchId), eq(branches.orgId, session.orgId))
        )
        .returning();

      if (!updated) return err("Branch not found", 404);
      return ok(updated);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to update branch",
        500
      );
    }
  });
}
