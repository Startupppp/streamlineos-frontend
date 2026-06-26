import { withAuth, withAbility, ok, err, parseBody } from "@/lib/api/helpers"; 
import { db } from "@/lib/db";
import { assetReturns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionAbility } from "@/lib/abilities-server";
import { z, ZodError } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1),
  assetId: z.number().int().positive().optional(),
  assetName: z.string().min(1, "Asset name is required"),
  notes: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const ability = await getSessionAbility();

    const isAdmin = ability.can("manage", "hr:assets");

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
  return withAbility("manage", "hr:assets", async (session) => {
    let body: z.infer<typeof createSchema>;
    try {
      body = await parseBody(req, createSchema);
    } catch (e) {
      if (e instanceof ZodError) {
        return err(e.issues.map((issue) => issue.message).join(", "), 400);
      }
      return err("Invalid request body", 400);
    }

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
