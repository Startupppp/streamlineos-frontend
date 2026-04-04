import { type NextRequest } from "next/server";
import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  return withAdmin(async (session) => {
    const { keyId } = await params;

    const key = await db.query.apiKeys.findFirst({
      where: and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, session.orgId)),
    });

    if (!key) return err("API key not found", 404);
    if (key.isRevoked) return err("API key is already revoked", 400);

    await db.update(apiKeys).set({ isRevoked: true }).where(eq(apiKeys.id, keyId));

    return ok({ success: true });
  });
}
