import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invLocations, invWarehouses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const createLocationSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  locationType: z.enum(["ZONE", "AISLE", "RACK", "BIN"]),
  parentLocationId: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
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
        columns: { id: true },
      });
      if (!warehouse) return err("Warehouse not found", 404);

      const locations = await db.query.invLocations.findMany({
        where: and(
          eq(invLocations.warehouseId, warehouseId),
          eq(invLocations.orgId, session.orgId),
        ),
        with: { children: true },
        orderBy: (t, { asc }) => [asc(t.name)],
      });

      return ok(locations);
    } catch {
      return err("Failed to load locations", 500);
    }
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { warehouseId: raw } = await ctx.params;
  const warehouseId = Number(raw);
  if (!Number.isFinite(warehouseId)) return err("Invalid warehouse id", 400);

  return withAbility("create", "inventory:warehouses", async (session) => {
    try {
      const warehouse = await db.query.invWarehouses.findFirst({
        where: and(eq(invWarehouses.id, warehouseId), eq(invWarehouses.orgId, session.orgId)),
        columns: { id: true },
      });
      if (!warehouse) return err("Warehouse not found", 404);

      const input = await parseBody(req, createLocationSchema);

      const [location] = await db
        .insert(invLocations)
        .values({
          orgId: session.orgId,
          warehouseId,
          name: input.name,
          code: input.code,
          locationType: input.locationType,
          parentLocationId: input.parentLocationId ?? null,
          isActive: input.isActive,
        })
        .returning();

      return ok(location, 201);
    } catch {
      return err("Failed to create location", 500);
    }
  });
}
