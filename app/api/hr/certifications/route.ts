import { withAuth, ok, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { certifications } from "@/lib/db/schema";
import { eq, and, desc, lte, gte } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  userId: z.string().min(1).optional(),
  expiringSoon: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
  issuingOrganization: z.string().trim().min(1, "Issuing organization is required").max(200),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(100).optional(),
  credentialUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  documentUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
}).refine(
  (d) => !d.issueDate || !d.expiryDate || d.expiryDate >= d.issueDate,
  { message: "Expiry date must be after the issue date", path: ["expiryDate"] },
);

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { userId, expiringSoon, limit } = parseQuery(req, listSchema);

    const conditions = [eq(certifications.orgId, session.orgId)];
    if (userId) conditions.push(eq(certifications.userId, userId));

    if (expiringSoon === "true") {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      conditions.push(lte(certifications.expiryDate, thirtyDaysFromNow.toISOString().split("T")[0]));
      conditions.push(gte(certifications.expiryDate, new Date().toISOString().split("T")[0]));
    }

    const data = await db.query.certifications.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(certifications.createdAt)],
      limit,
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createSchema);
    const [cert] = await db.insert(certifications).values({
      orgId: session.orgId,
      userId: body.userId ?? session.user.id,
      name: body.name,
      issuingOrganization: body.issuingOrganization,
      issueDate: body.issueDate,
      expiryDate: body.expiryDate,
      credentialId: body.credentialId,
      credentialUrl: body.credentialUrl || undefined,
      documentUrl: body.documentUrl || undefined,
    }).returning();
    return ok(cert, 201);
  });
}
