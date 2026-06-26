import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidateReferrals, candidates, jobPostings } from "@/lib/db/schema";
import { eq, desc, or } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  firstName: z.string().min(1).trim(),
  lastName: z.string().min(1).trim(),
  email: z.string().email().toLowerCase(),
  phone: z.string().optional(),
  jobPostingId: z.number().int().positive().optional(),
  relationship: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    const isHR = role === "CEO" || role === "HR" || role === "ADMIN" || role === "HR_MANAGER";

    const data = await db.query.candidateReferrals.findMany({
      where: isHR
        ? eq(candidateReferrals.orgId, session.orgId)
        : eq(candidateReferrals.referredBy, session.user.id),
      with: {
        candidate: { columns: { id: true, firstName: true, lastName: true, email: true } },
        referrer: { columns: { id: true, name: true, email: true } },
        jobPosting: { columns: { id: true, title: true } },
      },
      orderBy: [desc(candidateReferrals.createdAt)],
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);

    const existing = await db.query.candidates.findFirst({
      where: eq(candidates.email, body.email),
    });

    let candidateId: number;

    if (existing) {
      candidateId = existing.id;
    } else {
      const [created] = await db.insert(candidates).values({
        orgId: session.orgId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        source: "REFERRAL",
      }).returning({ id: candidates.id });
      candidateId = created.id;
    }

    if (body.jobPostingId) {
      const job = await db.query.jobPostings.findFirst({
        where: eq(jobPostings.id, body.jobPostingId),
      });
      if (!job || job.orgId !== session.orgId) return err("Job posting not found", 404);
    }

    const [referral] = await db.insert(candidateReferrals).values({
      orgId: session.orgId,
      candidateId,
      referredBy: session.user.id,
      jobPostingId: body.jobPostingId,
      relationship: body.relationship,
      notes: body.notes,
      status: "SUBMITTED",
    }).returning();

    return ok(referral, 201);
  });
}
