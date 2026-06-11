import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import type { NextRequest } from "next/server";

type Ctx = { params: Promise<{ keyId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();
    if (!ability.can("manage", "settings")) {
      return err("Only admins can revoke API keys.", 403);
    }
    const { keyId } = await ctx.params;

    const existing = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, session.orgId)),
    });
    if (!existing) return err("API key not found.", 404);

    await db.update(apiKeys).set({ isRevoked: true }).where(eq(apiKeys.id, keyId));
    return ok({ success: true });
  });
}
