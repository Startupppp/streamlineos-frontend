import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ledgerAccounts } from "@/lib/db/schema/accounting";
import { withModuleAbility, parseBody, ok, err } from "@/lib/api/helpers";
import { updateAccountSchema } from "@/lib/validation/accounting-schemas";
import { CacheTag, orgScopedTag } from "@/lib/api/cache-tags";

type Params = { params: Promise<{ accountId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { accountId } = await params;
  const id = Number(accountId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid account id", 400);

  return withModuleAbility("accounting", "update", "accounting:accounts", async (session) => {
    const input = await parseBody(req, updateAccountSchema);

    const updated = await db
      .update(ledgerAccounts)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(ledgerAccounts.id, id), eq(ledgerAccounts.orgId, session.orgId)))
      .returning();
    if (updated.length === 0) return err("Account not found", 404);

    revalidateTag(orgScopedTag(CacheTag.ledgerAccounts, session.orgId), "default");
    return ok(updated[0]);
  });
}
