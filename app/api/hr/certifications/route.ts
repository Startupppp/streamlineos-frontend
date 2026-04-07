import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { certifications } from "@/lib/db/schema";
import { eq, and, desc, lte, gte } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  name: z.string().min(1, "Name is required").max(200),
  issuingOrganization: z.string().max(200).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(100).optional(),
  credentialUrl: z.string().url().optional().or(z.literal("")),
  documentUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const userId = req.nextUrl.searchParams.get("userId");
    const expiringSoon = req.nextUrl.searchParams.get("expiringSoon");

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
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
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
