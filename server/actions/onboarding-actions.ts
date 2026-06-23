"use server";

import { db } from "@/lib/db";
import { users, documents, onboardingSteps, organizationMembers, leaveTypes, leaveBalances } from "@/lib/db/schema";

import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { encrypt, encryptBankDetails } from "@/lib/encryption";
import { auth, invalidateUserSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const personalDetailsSchema = z.object({
  phone: z.string().trim().min(1, "Phone number is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
  addressLine1: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressState: z.string().trim().optional(),
  addressPostalCode: z.string().trim().optional(),
  addressCountry: z.string().trim().optional(),
  emergencyName: z.string().trim().min(1, "Emergency contact name is required"),
  emergencyRelation: z.string().trim().min(1, "Emergency contact relationship is required"),
  emergencyPhone: z.string().trim().min(1, "Emergency contact phone is required"),
});

const DOCUMENT_TYPE_VALUES = ["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"] as const;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const documentUploadSchema = z.object({
  type: z.enum(DOCUMENT_TYPE_VALUES),
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, "No file provided")
    .refine((f) => f.size <= MAX_FILE_SIZE_BYTES, "File size must be under 5MB")
    .refine((f) => (ALLOWED_MIME_TYPES as readonly string[]).includes(f.type), "Unsupported file type"),
});

export async function updatePersonalDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const parsed = personalDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const data = parsed.data;

  const address = {
    ...(data.addressLine1 ? { line1: data.addressLine1 } : {}),
    ...(data.addressCity ? { city: data.addressCity } : {}),
    ...(data.addressState ? { state: data.addressState } : {}),
    ...(data.addressPostalCode ? { postalCode: data.addressPostalCode } : {}),
    ...(data.addressCountry ? { country: data.addressCountry } : {}),
  };

  try {
    await db.update(users).set({
      phone: data.phone,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      ...(Object.keys(address).length > 0 ? { address } : {}),
      emergencyContact: {
        name: data.emergencyName,
        relation: data.emergencyRelation,
        phone: data.emergencyPhone,
      },
    }).where(eq(users.id, userId));

    await updateOnboardingStep(userId, "Personal Details", "COMPLETED");
    return { success: true };
  } catch {
    return { error: "Failed to update profile" };
  }
}

export async function updateBankDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const bankDetails = {
    accountNumber: formData.get("accountNumber") as string,
    bankName: formData.get("bankName") as string,
    branch: formData.get("branch") as string,
    ifsc: formData.get("ifsc") as string,
    accountHolder: formData.get("accountHolder") as string,
  };
  const taxId = formData.get("taxId") as string;

  try {
    await db.update(users).set({
      bankDetails: bankDetails.accountNumber ? encryptBankDetails(bankDetails) : undefined,
      taxId: taxId ? encrypt(taxId) : undefined,
    }).where(eq(users.id, userId));

    await updateOnboardingStep(userId, "Bank Details", "COMPLETED");
    return { success: true };
  } catch {
    return { error: "Failed to update bank details" };
  }
}

export async function uploadOnboardingDocument(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = documentUploadSchema.safeParse({
    type: formData.get("type"),
    file: formData.get("file"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid document" };
  }
  const { file, type: docType } = parsed.data;

  try {
    if (!isStorageConfigured()) {
      return { error: "Cloud storage (R2) is not configured. Contact your administrator." };
    }

    const result = await uploadFile(file, "onboarding");
    const fileUrl = result.url;
    const userOrg = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id),
    });

    if (!userOrg) return { error: "No organization found" };

    await db.insert(documents).values({
      orgId: userOrg.orgId,
      userId: session.user.id,
      name: file.name,
      type: docType,
      fileUrl: fileUrl,
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: session.user.id,
    });
    await updateOnboardingStep(session.user.id, `Upload ${docType}`, "COMPLETED", userOrg.orgId);

    return { success: true, url: fileUrl };
  } catch {
    return { error: "Failed to upload document" };
  }
}
export async function submitOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    const userOrg = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, session.user.id),
    });

    if (!userOrg) return { error: "No organization found" };

    await updateOnboardingStep(session.user.id, "Final Review", "COMPLETED", userOrg.orgId);
    await allocateDefaultLeaves(session.user.id, userOrg.orgId);
    await db.update(users)
      .set({ onboardingCompletedAt: new Date() })
      .where(eq(users.id, session.user.id));
    await invalidateUserSession(session.user.id);

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Failed to submit onboarding" };
  }
}

async function updateOnboardingStep(userId: string, stepName: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED", orgId?: string) {
    let targetOrgId = orgId;
    if (!targetOrgId) {
         const userOrg = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, userId),
        });
        targetOrgId = userOrg?.orgId;
    }

    if (!targetOrgId) return;
    const existing = await db.query.onboardingSteps.findFirst({
        where: and(
            eq(onboardingSteps.userId, userId),
            eq(onboardingSteps.stepName, stepName)
        )
    });

    if (existing) {
        await db.update(onboardingSteps)
            .set({ status, completedAt: status === 'COMPLETED' ? new Date() : null })
            .where(eq(onboardingSteps.id, existing.id));
    } else {
        await db.insert(onboardingSteps).values({
            userId,
            orgId: targetOrgId,
            stepName,
            status,
            completedAt: status === 'COMPLETED' ? new Date() : null
        });
    }
}

async function allocateDefaultLeaves(userId: string, orgId: string) {
  const currentYear = new Date().getFullYear();

  const existingBalances = await db.query.leaveBalances.findFirst({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.year, currentYear)
    ),
  });

  if (existingBalances) return;

  const orgLeaveTypes = await db.query.leaveTypes.findMany({
    where: eq(leaveTypes.orgId, orgId),
  });

  if (orgLeaveTypes.length === 0) return;

  await db.insert(leaveBalances).values(
    orgLeaveTypes.map((lt) => ({
      orgId,
      userId,
      leaveTypeId: lt.id,
      balance: String(lt.daysPerYear),
      year: currentYear,
    }))
  );
}
