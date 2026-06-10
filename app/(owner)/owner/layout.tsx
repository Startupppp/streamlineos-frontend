import { ReactNode } from "react";
import { sql, eq, and, isNull } from "drizzle-orm";
import { requirePlatformOwner } from "@/lib/platform/session";
import { db } from "@/lib/db";
import { platformMessages, users } from "@/lib/db/schema";
import { OwnerSidebar } from "@/components/owner/owner-sidebar";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requirePlatformOwner();

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
      where: eq(users.id, session.user!.id as string),
      columns: { name: true, email: true, firstName: true, lastName: true },
    }),
  ]);

  const ownerName =
    ownerRow?.name ||
    [ownerRow?.firstName, ownerRow?.lastName].filter(Boolean).join(" ") ||
    (ownerRow?.email ?? "Platform Owner");

  return (
    <div className="flex min-h-screen bg-[#f6f8fc]">
      <OwnerSidebar
        ownerName={ownerName}
        ownerEmail={ownerRow?.email ?? ""}
        unreadInbox={unreadRow}
      />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-6 py-4">{children}</div>
      </main>
    </div>
  );
}
