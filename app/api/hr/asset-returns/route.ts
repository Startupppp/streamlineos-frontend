import { withAuth, withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assetReturns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  assetId: z.number().int().positive().optional(),
  assetName: z.string().min(1, "Asset name is required"),
  notes: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);

    const data = await db
      .select()
      .from(assetReturns)
      .where(
        isAdmin
          ? eq(assetReturns.orgId, session.orgId)
          : eq(assetReturns.userId, session.user.id)
      )
      .orderBy(desc(assetReturns.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = createSchema.parse(await req.json());

    const [record] = await db
      .insert(assetReturns)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        assetId: body.assetId ?? null,
        assetName: body.assetName,
        notes: body.notes ?? null,
        status: "PENDING",
      })
      .returning();

    return ok(record, 201);
  });
}
