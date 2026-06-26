import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  candidates, jobPostings, interviews, candidateOffers,
} from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const filtersSchema = z.object({
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  departmentId: z.number().int().positive().optional(),
});

const schema = z.object({
  entity: z.enum(["candidates", "jobs", "interviews", "offers"]),
  fields: z.array(z.string()).min(1),
  filters: filtersSchema.default({}),
});

const CANDIDATE_FIELDS = [
  "id", "firstName", "lastName", "email", "phone", "status", "source",
  "currentCompany", "currentRole", "experienceYears", "rating", "aiScore",
  "location", "gender", "createdAt",
] as const;

const JOB_FIELDS = [
  "id", "title", "status", "type", "location", "openings", "salaryMin",
  "salaryMax", "createdAt", "applicationDeadline",
] as const;

const INTERVIEW_FIELDS = [
  "id", "type", "scheduledAt", "result", "rating", "duration", "location",
  "createdAt",
] as const;

const OFFER_FIELDS = [
  "id", "offerStatus", "offeredSalary", "offeredDesignation", "joiningDate",
  "validUntil", "sentAt", "respondedAt", "createdAt",
] as const;

function pickFields<T extends Record<string, unknown>>(row: T, fields: string[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f, row[f] ?? null]));
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, schema);
    const { entity, fields, filters } = body;
    const orgId = session.orgId;

    let rows: Record<string, unknown>[] = [];

    if (entity === "candidates") {
      const validFields = fields.filter((f) => (CANDIDATE_FIELDS as readonly string[]).includes(f));
      const result = await db.select().from(candidates).where(
        and(
          eq(candidates.orgId, orgId),
          filters.status ? eq(candidates.status, filters.status as "NEW" | "SCREENING" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED") : undefined,
          filters.dateFrom ? gte(candidates.createdAt, new Date(filters.dateFrom)) : undefined,
          filters.dateTo ? lte(candidates.createdAt, new Date(filters.dateTo)) : undefined,
        ),
      );
      rows = result.map((r) => pickFields(r as unknown as Record<string, unknown>, validFields.length ? validFields : [...CANDIDATE_FIELDS]));
    }

    if (entity === "jobs") {
      const validFields = fields.filter((f) => (JOB_FIELDS as readonly string[]).includes(f));
      const whereConditions = [
        eq(jobPostings.orgId, orgId),
        filters.dateFrom ? gte(jobPostings.createdAt, new Date(filters.dateFrom)) : undefined,
        filters.dateTo ? lte(jobPostings.createdAt, new Date(filters.dateTo)) : undefined,
        filters.departmentId ? eq(jobPostings.departmentId, filters.departmentId) : undefined,
      ].filter(Boolean);
      const result = await db.select().from(jobPostings).where(and(...whereConditions));
      rows = result.map((r) => pickFields(r as unknown as Record<string, unknown>, validFields.length ? validFields : [...JOB_FIELDS]));
    }

    if (entity === "interviews") {
      const validFields = fields.filter((f) => (INTERVIEW_FIELDS as readonly string[]).includes(f));
      const whereConditions = [
        eq(interviews.orgId, orgId),
        filters.dateFrom ? gte(interviews.scheduledAt, new Date(filters.dateFrom)) : undefined,
        filters.dateTo ? lte(interviews.scheduledAt, new Date(filters.dateTo)) : undefined,
      ].filter(Boolean);
      const result = await db.select().from(interviews).where(and(...whereConditions));
      rows = result.map((r) => pickFields(r as unknown as Record<string, unknown>, validFields.length ? validFields : [...INTERVIEW_FIELDS]));
    }

    if (entity === "offers") {
      const validFields = fields.filter((f) => (OFFER_FIELDS as readonly string[]).includes(f));
      const whereConditions = [
        eq(candidateOffers.orgId, orgId),
        filters.dateFrom ? gte(candidateOffers.createdAt, new Date(filters.dateFrom)) : undefined,
        filters.dateTo ? lte(candidateOffers.createdAt, new Date(filters.dateTo)) : undefined,
      ].filter(Boolean);
      const result = await db.select().from(candidateOffers).where(and(...whereConditions));
      rows = result.map((r) => pickFields(r as unknown as Record<string, unknown>, validFields.length ? validFields : [...OFFER_FIELDS]));
    }

    return ok({ rows, entity, fields, total: rows.length });
  });
}
