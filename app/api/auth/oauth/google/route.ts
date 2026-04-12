import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE() {
  return withAuth(async (session) => {
    const existing = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "google")
      ),
    });

    if (!existing) return err("No Google account linked", 404);

    await db.delete(accounts).where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "google")
      )
    );

    return ok({ unlinked: true });
  });
}
