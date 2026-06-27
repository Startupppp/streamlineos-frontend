import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody, serverErr } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invWarehouses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateWarehouseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

type Ctx = { params: Promise<{ warehouseId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { warehouseId: raw } = await ctx.params;
  const warehouseId = Number(raw);
  if (!Number.isFinite(warehouseId)) return err("Invalid warehouse id", 400);

  return withAbility("read", "inventory:warehouses", async (session) => {
    try {
      const warehouse = await db.query.invWarehouses.findFirst({
        where: and(eq(invWarehouses.id, warehouseId), eq(invWarehouses.orgId, session.orgId)),
        with: { locations: true },
      });
      if (!warehouse) return err("Warehouse not found", 404);
      return ok(warehouse);
    } catch (error) {
      return serverErr("Failed to load warehouse", error);
    }
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { warehouseId: raw } = await ctx.params;
  const warehouseId = Number(raw);
  if (!Number.isFinite(warehouseId)) return err("Invalid warehouse id", 400);

  return withAbility("update", "inventory:warehouses", async (session) => {
    try {
      const input = await parseBody(req, updateWarehouseSchema);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.code !== undefined) updateData.code = input.code;
      if ("address" in input) updateData.address = input.address;
      if ("city" in input) updateData.city = input.city;
      if ("state" in input) updateData.state = input.state;
      if ("country" in input) updateData.country = input.country;
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const [updated] = await db
        .update(invWarehouses)
        .set(updateData)
        .where(and(eq(invWarehouses.id, warehouseId), eq(invWarehouses.orgId, session.orgId)))
        .returning();

      if (!updated) return err("Warehouse not found", 404);
      return ok(updated);
    } catch (error) {
      return serverErr("Failed to update warehouse", error);
    }
  });
}
