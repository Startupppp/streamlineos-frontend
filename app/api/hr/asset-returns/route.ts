import { withAuth, withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { assetReturns } from "@/lib/db/schema";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { listAssetReturnsForSession } from "@/server/queries/hr/asset-returns";

const createSchema = z.object({
  userId: z.string().min(1),
  assetId: z.number().int().positive().optional(),
  assetName: z.string().min(1, "Asset name is required"),
  notes: z.string().optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const data = await listAssetReturnsForSession({
      orgId: session.orgId,
      userId: session.user.id,
      role: session.user.role,
    });
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
