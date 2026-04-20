import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateOffers, candidates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

type RouteParams = { params: Promise<{ candidateId: string }> };

const HR_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR"];

const createOfferSchema = z.object({
  jobPostingId: z.number().int().optional(),
  offeredSalary: z.number().positive().optional(),
  offeredDesignation: z.string().min(1).optional(),
  joiningDate: z.string().optional(),
  offerLetterUrl: z.string().url().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    const offers = await db.query.candidateOffers.findMany({
      where: and(
        eq(candidateOffers.candidateId, candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
      orderBy: [desc(candidateOffers.createdAt)],
    });

    return ok(offers);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    if (!HR_ROLES.includes(session.user.role ?? "")) {
      return err("Forbidden", 403);
    }

    const input = await parseBody(req, createOfferSchema);
    

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!candidate) return err("Candidate not found", 404);

    const [offer] = await db
      .insert(candidateOffers)
      .values({
        orgId: session.orgId,
        candidateId,
        offeredBy: session.user.id,
        jobPostingId: input.jobPostingId,
        offeredSalary: input.offeredSalary?.toString(),
        offeredDesignation: input.offeredDesignation,
        joiningDate: input.joiningDate,
        offerLetterUrl: input.offerLetterUrl,
        validUntil: input.validUntil,
        notes: input.notes,
      })
      .returning();

    return ok(offer, 201);
  });
}
