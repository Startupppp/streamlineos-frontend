import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody, serverErr } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invUom } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createUomSchema = z.object({
  name: z.string().min(1).max(100),
  abbreviation: z.string().min(1).max(20),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  return withAbility("read", "inventory:products", async (session) => {
    try {
      const uoms = await db.query.invUom.findMany({
        where: eq(invUom.orgId, session.orgId),
        orderBy: (t, { asc }) => [asc(t.name)],
      });
      return ok(uoms);
    } catch (error) {
      return serverErr("Failed to load units of measure", error);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "inventory:products", async (session) => {
    try {
      const input = await parseBody(req, createUomSchema);

      const [uom] = await db
        .insert(invUom)
        .values({
          orgId: session.orgId,
          name: input.name,
          abbreviation: input.abbreviation,
          isActive: input.isActive,
        })
        .returning();

      return ok(uom, 201);
    } catch (error) {
      return serverErr("Failed to create unit of measure", error);
    }
  });
}
