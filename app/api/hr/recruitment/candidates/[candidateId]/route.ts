import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      with: {
        applications: { with: { jobPosting: true } },
        interviews: true,
      },
    });

    if (!candidate) return err("Candidate not found.", 404);
    return ok(candidate);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!existing) return err("Candidate not found.", 404);

    const body = await req.json() as Record<string, unknown>;

    await db
      .update(candidates)
      .set({
        ...(body.firstName !== undefined && { firstName: body.firstName as string }),
        ...(body.lastName !== undefined && { lastName: body.lastName as string }),
        ...(body.email !== undefined && { email: body.email as string }),
        ...(body.phone !== undefined && { phone: body.phone as string }),
        ...(body.status !== undefined && { status: body.status as typeof existing.status }),
        ...(body.notes !== undefined && { notes: body.notes as string }),
        ...(body.rating !== undefined && { rating: body.rating as number }),
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));

    return ok({ success: true });
  });
}
