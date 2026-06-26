import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invWarehouses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  return withAbility("read", "inventory:warehouses", async (session) => {
    try {
      const warehouses = await db.query.invWarehouses.findMany({
        where: eq(invWarehouses.orgId, session.orgId),
        orderBy: (t, { asc }) => [asc(t.name)],
      });
      return ok(warehouses);
    } catch {
      return err("Failed to load warehouses", 500);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "inventory:warehouses", async (session) => {
    try {
      const input = await parseBody(req, createWarehouseSchema);

      const [warehouse] = await db
        .insert(invWarehouses)
        .values({
          orgId: session.orgId,
          createdBy: session.user.id,
          name: input.name,
          code: input.code,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          country: input.country ?? null,
          isDefault: input.isDefault,
          isActive: input.isActive,
        })
        .returning();

      return ok(warehouse, 201);
    } catch {
      return err("Failed to create warehouse", 500);
    }
  });
}
