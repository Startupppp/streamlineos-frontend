import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseQuery, serverErr } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invProductVariants, invProducts } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { z } from "zod";

const listVariantsSchema = z.object({
  search: z.string().optional(),
  activeOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:products", async (session) => {
    try {
      const { search, activeOnly } = parseQuery(req, listVariantsSchema);

      const variantConditions = [eq(invProductVariants.orgId, session.orgId)];
      if (activeOnly) variantConditions.push(eq(invProductVariants.isActive, true));
      if (search) variantConditions.push(ilike(invProductVariants.sku, `%${search}%`));

      const variants = await db.query.invProductVariants.findMany({
        where: and(...variantConditions),
        with: {
          product: {
            columns: { id: true, name: true, status: true },
          },
        },
        columns: { id: true, productId: true, name: true, sku: true, costPrice: true, isActive: true },
        limit: 200,
        orderBy: (v, { asc }) => [asc(v.name)],
      });

      return ok(variants);
    } catch (error) {
      return serverErr("Failed to load product variants", error);
    }
  });
}
