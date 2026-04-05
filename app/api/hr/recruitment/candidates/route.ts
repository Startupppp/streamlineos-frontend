import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { NextRequest } from "next/server";
import type { CandidateStatus } from "@/types/hr";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const status = req.nextUrl.searchParams.get("status") as CandidateStatus | null;

    const conditions = [eq(candidates.orgId, session.orgId)];
    if (status) conditions.push(eq(candidates.status, status));

    const data = await db.query.candidates.findMany({
      where: and(...conditions),
      orderBy: [desc(candidates.createdAt)],
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json() as {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      resumeUrl?: string;
      linkedinUrl?: string;
      portfolioUrl?: string;
      currentCompany?: string;
      currentRole?: string;
      experienceYears?: number;
      skills?: string[];
      source?: string;
      notes?: string;
    };

    if (!body.firstName || !body.lastName || !body.email) {
      return err("firstName, lastName, and email are required.", 400);
    }

    const [candidate] = await db
      .insert(candidates)
      .values({
        orgId: session.orgId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        resumeUrl: body.resumeUrl,
        linkedinUrl: body.linkedinUrl,
        portfolioUrl: body.portfolioUrl,
        currentCompany: body.currentCompany,
        currentRole: body.currentRole,
        experienceYears: body.experienceYears?.toString(),
        skills: body.skills,
        source: body.source || "DIRECT",
        status: "NEW",
        notes: body.notes,
      })
      .returning();

    return ok(candidate);
  });
}
