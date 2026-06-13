import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documents, onboardingSteps, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import type { NextRequest } from "next/server";
import { z } from "zod";

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

const docTypeSchema = z.enum([
  "CONTRACT",
  "CERTIFICATE",
  "ID_PROOF",
  "PAYSLIP",
  "POLICY",
  "OFFER_LETTER",
  "RESUME",
  "OTHER",
]);

async function upsertOnboardingStep(userId: string, orgId: string, stepName: string) {
  const existing = await db.query.onboardingSteps.findFirst({
    where: and(eq(onboardingSteps.userId, userId), eq(onboardingSteps.stepName, stepName)),
  });
  if (existing) {
    await db.update(onboardingSteps)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(onboardingSteps.id, existing.id));
  } else {
    await db.insert(onboardingSteps).values({
      userId,
      orgId,
      stepName,
      status: "COMPLETED",
      completedAt: new Date(),
    });
  }
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isStorageConfigured()) {
      return err("Cloud storage (R2) is not configured. Contact your administrator.", 503);
    }

    const formData = await req.formData();
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;

    if (!file) return err("No file provided", 400);

    const typeResult = docTypeSchema.safeParse(formData.get("type"));
    if (!typeResult.success) return err("Invalid document type", 400);
    const type = typeResult.data;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return err("File type not allowed. Use PDF, JPEG, PNG, or WebP.", 400);
    }
    if (file.size > MAX_SIZE) {
      return err("File size must be under 5MB", 400);
    }

    const userOrg = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });
    if (!userOrg) return err("No organization found", 400);

    const result = await uploadFile(file, "onboarding");

    await db.insert(documents).values({
      orgId: userOrg.orgId,
      userId: session.user.id,
      name: file.name,
      type,
      fileUrl: result.url,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: session.user.id,
    });

    await upsertOnboardingStep(session.user.id, session.orgId, `Upload ${type}`);

    return ok({ url: result.url }, 201);
  });
}
