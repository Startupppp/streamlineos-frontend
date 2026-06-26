import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { invProducts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(100).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  uomId: z.number().int().positive().nullable().optional(),
  barcode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED"]).optional(),
  costPrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  minStockLevel: z.number().nonnegative().optional(),
  maxStockLevel: z.number().nonnegative().optional(),
  hasVariants: z.boolean().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

type Ctx = { params: Promise<{ productId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { productId: raw } = await ctx.params;
  const productId = Number(raw);
  if (!Number.isFinite(productId)) return err("Invalid product id", 400);

  return withAbility("read", "inventory:products", async (session) => {
    try {
      const product = await db.query.invProducts.findFirst({
        where: and(eq(invProducts.id, productId), eq(invProducts.orgId, session.orgId)),
        with: { category: true, uom: true, variants: true },
      });
      if (!product) return err("Product not found", 404);
      return ok(product);
    } catch {
      return err("Failed to load product", 500);
    }
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { productId: raw } = await ctx.params;
  const productId = Number(raw);
  if (!Number.isFinite(productId)) return err("Invalid product id", 400);

  return withAbility("update", "inventory:products", async (session) => {
    try {
      const input = await parseBody(req, updateProductSchema);

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if ("categoryId" in input) updateData.categoryId = input.categoryId;
      if ("uomId" in input) updateData.uomId = input.uomId;
      if ("barcode" in input) updateData.barcode = input.barcode;
      if ("description" in input) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.costPrice !== undefined) updateData.costPrice = String(input.costPrice);
      if (input.sellingPrice !== undefined) updateData.sellingPrice = String(input.sellingPrice);
      if (input.reorderPoint !== undefined) updateData.reorderPoint = String(input.reorderPoint);
      if (input.minStockLevel !== undefined) updateData.minStockLevel = String(input.minStockLevel);
      if (input.maxStockLevel !== undefined) updateData.maxStockLevel = String(input.maxStockLevel);
      if (input.hasVariants !== undefined) updateData.hasVariants = input.hasVariants;
      if ("imageUrl" in input) updateData.imageUrl = input.imageUrl;

      const [updated] = await db
        .update(invProducts)
        .set(updateData)
        .where(and(eq(invProducts.id, productId), eq(invProducts.orgId, session.orgId)))
        .returning();

      if (!updated) return err("Product not found", 404);
      return ok(updated);
    } catch {
      return err("Failed to update product", 500);
    }
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { productId: raw } = await ctx.params;
  const productId = Number(raw);
  if (!Number.isFinite(productId)) return err("Invalid product id", 400);

  return withAbility("delete", "inventory:products", async (session) => {
    try {
      const [deleted] = await db
        .delete(invProducts)
        .where(and(eq(invProducts.id, productId), eq(invProducts.orgId, session.orgId)))
        .returning({ id: invProducts.id });

      if (!deleted) return err("Product not found", 404);
      return ok({ success: true });
    } catch {
      return err("Failed to delete product", 500);
    }
  });
}
