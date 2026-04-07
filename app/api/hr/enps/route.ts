import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { enpsScores } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth-helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  score: z.number().int().min(0).max(10),
  comment: z.string().optional(),
  isAnonymous: z.boolean().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);

    if (!isAdmin) {
      return err("Only admins can view eNPS scores.", 403);
    }

    const data = await db
      .select()
      .from(enpsScores)
      .where(eq(enpsScores.orgId, session.orgId))
      .orderBy(desc(enpsScores.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [record] = await db
      .insert(enpsScores)
      .values({
        orgId: session.orgId,
        userId: body.isAnonymous ? null : session.user.id,
        score: body.score,
        comment: body.comment ?? null,
        isAnonymous: body.isAnonymous ?? true,
        period,
      })
      .returning();

    return ok(record, 201);
  });
}
