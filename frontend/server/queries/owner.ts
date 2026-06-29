"server-only";

import { sql, eq, and, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { platformMessages, users } from "@/lib/db/schema";

export interface OwnerLayoutData {
  unreadCount: number;
  ownerName: string;
  ownerEmail: string;
}

export async function getOwnerLayoutData(userId: string): Promise<OwnerLayoutData> {
  const [unreadRow, ownerRow] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(platformMessages)
      .where(
        and(
          eq(platformMessages.status, "NEW"),
          isNull(platformMessages.repliedAt),
        ),
      )
      .then((r) => r[0]?.n ?? 0),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true, email: true, firstName: true, lastName: true },
    }),
  ]);

  const ownerName =
    ownerRow?.name ||
    [ownerRow?.firstName, ownerRow?.lastName].filter(Boolean).join(" ") ||
    (ownerRow?.email ?? "Platform Owner");

  return {
    unreadCount: unreadRow,
    ownerName,
    ownerEmail: ownerRow?.email ?? "",
  };
}
