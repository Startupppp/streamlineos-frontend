"use server";

import { db } from "@/lib/db";
import { users, documents, onboardingSteps, organizationMembers, leaveTypes, leaveBalances } from "@/lib/db/schema";

import { eq, and } from "drizzle-orm";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updatePersonalDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const phone = formData.get("phone") as string;
  const skills = (formData.get("skills") as string)?.split(",").map(s => s.trim()).filter(Boolean);
  const experienceYears = formData.get("experienceYears") as string;
  const genderRaw = formData.get("gender") as string | null;
  const dateOfBirth = formData.get("dateOfBirth") as string | null;

  const gender = genderRaw === "MALE" || genderRaw === "FEMALE" || genderRaw === "OTHER"
    ? genderRaw
    : undefined;

  try {
    await db.update(users).set({
      phone,
      skills,
      experienceYears: experienceYears ? experienceYears.toString() : undefined,
      ...(gender ? { gender } : {}),
      ...(dateOfBirth ? { dateOfBirth } : {}),
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
      bankDetails: bankDetails,
      taxId: taxId,
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

  const file = formData.get("file") as File;
  const docType = formData.get("type") as "CONTRACT" | "CERTIFICATE" | "ID_PROOF" | "PAYSLIP" | "POLICY" | "OFFER_LETTER" | "RESUME" | "OTHER";

  if (!file) return { error: "No file provided" };

  try {
    if (!isStorageConfigured()) {
      return { error: "Cloud storage (R2) is not configured. Contact your administrator." };
    }

    let fileUrl = "";
    const result = await uploadFile(file, "onboarding");
    fileUrl = result.url;
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

    revalidatePath("/onboarding");
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

    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
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
