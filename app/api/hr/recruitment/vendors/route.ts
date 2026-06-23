import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { recruitmentVendors, vendorCandidateSubmissions } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  website: z.string().url().optional().or(z.literal("")),
  feePercent: z.number().min(0).max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const vendors = await db
      .select({
        id: recruitmentVendors.id,
        name: recruitmentVendors.name,
        contactName: recruitmentVendors.contactName,
        contactEmail: recruitmentVendors.contactEmail,
        contactPhone: recruitmentVendors.contactPhone,
        website: recruitmentVendors.website,
        feePercent: recruitmentVendors.feePercent,
        status: recruitmentVendors.status,
        createdAt: recruitmentVendors.createdAt,
        submissionCount: count(vendorCandidateSubmissions.id),
        placements: sql<number>`sum(case when ${vendorCandidateSubmissions.placementStatus} = 'PLACED' then 1 else 0 end)::int`,
        revenueTotal: sql<string>`coalesce(sum(case when ${vendorCandidateSubmissions.invoiceStatus} = 'PAID' then ${vendorCandidateSubmissions.invoiceAmount}::numeric else 0 end), 0)::text`,
      })
      .from(recruitmentVendors)
      .leftJoin(vendorCandidateSubmissions, eq(vendorCandidateSubmissions.vendorId, recruitmentVendors.id))
      .where(eq(recruitmentVendors.orgId, session.orgId))
      .groupBy(recruitmentVendors.id)
      .orderBy(recruitmentVendors.name);

    return ok(vendors);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (!["CEO", "HR", "ADMIN", "HR_MANAGER"].includes(role)) return err("Forbidden", 403);

    const body = await parseBody(req, createSchema);
    const [vendor] = await db
      .insert(recruitmentVendors)
      .values({
        orgId: session.orgId,
        createdBy: session.user.id,
        name: body.name,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        website: body.website || undefined,
        feePercent: body.feePercent !== undefined ? String(body.feePercent) : undefined,
        status: body.status,
      })
      .returning();
    return ok(vendor, 201);
  });
}
