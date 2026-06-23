import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { recruitmentVendors, vendorCandidateSubmissions, candidates, jobPostings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ vendorId: string }> };

const createSchema = z.object({
  candidateId: z.number().int().positive(),
  jobPostingId: z.number().int().positive().optional(),
});

const updateSchema = z.object({
  placementStatus: z.enum(["SUBMITTED", "INTERVIEWING", "PLACED", "REJECTED"]).optional(),
  invoiceStatus: z.enum(["NOT_INVOICED", "INVOICED", "PAID"]).optional(),
  invoiceAmount: z.number().positive().optional(),
  invoiceDate: z.string().optional(),
  paidAt: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const { vendorId } = await params;
    const id = Number(vendorId);
    if (!Number.isFinite(id)) return err("Invalid vendor ID", 400);

    const vendor = await db.query.recruitmentVendors.findFirst({
      where: and(eq(recruitmentVendors.id, id), eq(recruitmentVendors.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!vendor) return err("Not found", 404);

    const rows = await db
      .select({
        id: vendorCandidateSubmissions.id,
        candidateId: vendorCandidateSubmissions.candidateId,
        jobPostingId: vendorCandidateSubmissions.jobPostingId,
        submittedAt: vendorCandidateSubmissions.submittedAt,
        placementStatus: vendorCandidateSubmissions.placementStatus,
        invoiceStatus: vendorCandidateSubmissions.invoiceStatus,
        invoiceAmount: vendorCandidateSubmissions.invoiceAmount,
        invoiceDate: vendorCandidateSubmissions.invoiceDate,
        paidAt: vendorCandidateSubmissions.paidAt,
        candidateFirstName: candidates.firstName,
        candidateLastName: candidates.lastName,
        candidateEmail: candidates.email,
        jobTitle: jobPostings.title,
      })
      .from(vendorCandidateSubmissions)
      .leftJoin(candidates, eq(vendorCandidateSubmissions.candidateId, candidates.id))
      .leftJoin(jobPostings, eq(vendorCandidateSubmissions.jobPostingId, jobPostings.id))
      .where(eq(vendorCandidateSubmissions.vendorId, id))
      .orderBy(desc(vendorCandidateSubmissions.submittedAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) return err("Forbidden", 403);

    const { vendorId } = await params;
    const id = Number(vendorId);
    if (!Number.isFinite(id)) return err("Invalid vendor ID", 400);

    const vendor = await db.query.recruitmentVendors.findFirst({
      where: and(eq(recruitmentVendors.id, id), eq(recruitmentVendors.orgId, session.orgId)),
      columns: { id: true },
    });
    if (!vendor) return err("Not found", 404);

    const body = await parseBody(req, createSchema);
    const [row] = await db
      .insert(vendorCandidateSubmissions)
      .values({ vendorId: id, candidateId: body.candidateId, jobPostingId: body.jobPostingId })
      .returning();
    return ok(row, 201);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) return err("Forbidden", 403);

    const { vendorId } = await params;
    const id = Number(vendorId);
    if (!Number.isFinite(id)) return err("Invalid vendor ID", 400);

    const url = new URL(req.url);
    const submissionId = Number(url.searchParams.get("submissionId"));
    if (!Number.isFinite(submissionId)) return err("submissionId query param required", 400);

    const body = await parseBody(req, updateSchema);
    const [updated] = await db
      .update(vendorCandidateSubmissions)
      .set({
        ...body,
        invoiceAmount: body.invoiceAmount !== undefined ? String(body.invoiceAmount) : undefined,
      })
      .where(and(eq(vendorCandidateSubmissions.id, submissionId), eq(vendorCandidateSubmissions.vendorId, id)))
      .returning();
    return ok(updated);
  });
}
