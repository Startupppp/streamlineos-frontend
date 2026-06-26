import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invProducts } from "@/lib/db/schema";
import { eq, and, ilike, count } from "drizzle-orm";
import { z } from "zod";

const listProductsSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  categoryId: z.number().int().positive().optional(),
  uomId: z.number().int().positive().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).default("ACTIVE"),
  costPrice: z.number().nonnegative().default(0),
  sellingPrice: z.number().nonnegative().default(0),
  reorderPoint: z.number().nonnegative().default(0),
  minStockLevel: z.number().nonnegative().default(0),
  maxStockLevel: z.number().nonnegative().default(0),
  hasVariants: z.boolean().default(false),
  imageUrl: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:products", async (session) => {
    try {
      const { status, categoryId, search, page, limit } = parseQuery(req, listProductsSchema);
      const offset = (page - 1) * limit;

      const conditions = [eq(invProducts.orgId, session.orgId)];
      if (status) conditions.push(eq(invProducts.status, status));
      if (categoryId) conditions.push(eq(invProducts.categoryId, categoryId));
      if (search) conditions.push(ilike(invProducts.name, `%${search}%`));

      const where = and(...conditions);

      const [items, [totals]] = await Promise.all([
        db.query.invProducts.findMany({
          where,
          with: { category: true, uom: true },
          limit,
          offset,
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        }),
        db.select({ total: count() }).from(invProducts).where(where),
      ]);

      return ok({ items, total: totals?.total ?? 0, page, limit });
    } catch {
      return err("Failed to load products", 500);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAbility("create", "inventory:products", async (session) => {
    try {
      const input = await parseBody(req, createProductSchema);

      const [product] = await db
        .insert(invProducts)
        .values({
          orgId: session.orgId,
          createdBy: session.user.id,
          name: input.name,
          sku: input.sku,
          categoryId: input.categoryId ?? null,
          uomId: input.uomId ?? null,
          barcode: input.barcode ?? null,
          description: input.description ?? null,
          status: input.status,
          costPrice: String(input.costPrice),
          sellingPrice: String(input.sellingPrice),
          reorderPoint: String(input.reorderPoint),
          minStockLevel: String(input.minStockLevel),
          maxStockLevel: String(input.maxStockLevel),
          hasVariants: input.hasVariants,
          imageUrl: input.imageUrl ?? null,
        })
        .returning();

      return ok(product, 201);
    } catch {
      return err("Failed to create product", 500);
    }
  });
}
