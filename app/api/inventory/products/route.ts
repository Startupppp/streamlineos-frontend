import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseQuery, parseBody, serverErr, toBool } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invProducts } from "@/lib/db/schema";
import { eq, and, ilike, or, count } from "drizzle-orm";
import { z } from "zod";

const listProductsSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  isActive: z.preprocess(
    (val) => toBool(val as string | undefined),
    z.boolean().optional(),
  ),
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

function mapProductRow(row: {
  id: number;
  name: string;
  sku: string;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  costPrice: string;
  sellingPrice: string;
  category?: { name: string } | null;
  uom?: { name: string; abbreviation: string } | null;
}) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    categoryName: row.category?.name ?? null,
    uomName: row.uom?.abbreviation ?? row.uom?.name ?? null,
    costPrice: row.costPrice,
    sellingPrice: row.sellingPrice,
    totalStock: 0,
    isActive: row.status === "ACTIVE",
    status: row.status,
  };
}

export async function GET(req: NextRequest) {
  return withAbility("read", "inventory:products", async (session) => {
    try {
      const { status, isActive, categoryId, search, page, limit } = parseQuery(
        req,
        listProductsSchema,
      );
      const offset = (page - 1) * limit;

      const resolvedStatus =
        status ??
        (isActive === true ? "ACTIVE" : isActive === false ? "INACTIVE" : undefined);

      const conditions = [eq(invProducts.orgId, session.orgId)];
      if (resolvedStatus) conditions.push(eq(invProducts.status, resolvedStatus));
      if (categoryId) conditions.push(eq(invProducts.categoryId, categoryId));
      if (search) {
        conditions.push(
          or(
            ilike(invProducts.name, `%${search}%`),
            ilike(invProducts.sku, `%${search}%`),
          )!,
        );
      }

      const where = and(...conditions);

      const [rows, [totals]] = await Promise.all([
        db.query.invProducts.findMany({
          where,
          with: { category: true, uom: true },
          limit,
          offset,
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        }),
        db.select({ total: count() }).from(invProducts).where(where),
      ]);

      const total = totals?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      return ok({
        items: rows.map(mapProductRow),
        total,
        page,
        limit,
        totalPages,
      });
    } catch (error) {
      return serverErr("Failed to load products", error);
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
    } catch (error) {
      return serverErr("Failed to create product", error);
    }
  });
}
