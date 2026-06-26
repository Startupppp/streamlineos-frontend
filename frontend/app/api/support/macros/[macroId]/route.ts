import { type NextRequest } from "next/server";
import { withAbility, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { supportMacros } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  body: z.string().trim().min(1).max(10000).optional(),
  category: z.string().trim().max(100).nullable().optional(),
});

type RouteContext = { params: Promise<{ macroId: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:macros", async (session) => {
    const { macroId: idStr } = await ctx.params;
    const macroId = Number(idStr);
    if (!Number.isFinite(macroId)) return err("Invalid macro ID", 400);

    const input = await parseBody(req, updateSchema);

    const [updated] = await db
      .update(supportMacros)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(supportMacros.id, macroId), eq(supportMacros.orgId, session.orgId)))
      .returning();

    if (!updated) return err("Macro not found", 404);
    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  return withAbility("manage", "support:macros", async (session) => {
    const { macroId: idStr } = await ctx.params;
    const macroId = Number(idStr);
    if (!Number.isFinite(macroId)) return err("Invalid macro ID", 400);

    const [deleted] = await db
      .delete(supportMacros)
      .where(and(eq(supportMacros.id, macroId), eq(supportMacros.orgId, session.orgId)))
      .returning();

    if (!deleted) return err("Macro not found", 404);
    return ok({ success: true });
  });
}
