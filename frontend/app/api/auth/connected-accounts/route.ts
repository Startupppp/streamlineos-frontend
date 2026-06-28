import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({ provider: accounts.provider, providerAccountId: accounts.providerAccountId })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  return NextResponse.json(rows);
}

const unlinkSchema = z.object({ provider: z.string().min(1) });

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = unlinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const connectedAccounts = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  if (connectedAccounts.length <= 1) {
    return NextResponse.json(
      { error: "Cannot unlink the only connected account" },
      { status: 400 },
    );
  }

  await db
    .delete(accounts)
    .where(
      and(eq(accounts.userId, session.user.id), eq(accounts.provider, parsed.data.provider)),
    );

  return NextResponse.json({ success: true });
}
