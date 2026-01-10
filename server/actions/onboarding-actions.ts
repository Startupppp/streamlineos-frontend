"use server";

import { db } from "@/lib/db";
import { users, documents, onboardingSteps, organizationMembers } from "@/lib/db/schema";


import { eq, and } from "drizzle-orm";
import { uploadFile } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updatePersonalDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const userId = session.user.id;

  const phone = formData.get("phone") as string;
  const skills = (formData.get("skills") as string)?.split(",").map(s => s.trim()).filter(Boolean);
  const experienceYears = formData.get("experienceYears") as string;

  try {
    await db.update(users).set({
      phone,
      skills,
      experienceYears: experienceYears ? experienceYears.toString() : undefined,
    }).where(eq(users.id, userId));

    await updateOnboardingStep(userId, "Personal Details", "COMPLETED");
    return { success: true };
  } catch (error) {
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
  } catch (error) {
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
    let fileUrl = "";
    // Mock upload if keys missing or upload fails
    try {
      if (process.env.R2_ACCESS_KEY_ID) {
         const result = await uploadFile(file, "onboarding");
         fileUrl = result.url;
      } else {
         throw new Error("No keys");
      }
    } catch (e) {
      // In production, storage should be configured - don't use mock URLs
      throw new Error("Storage not configured. Please set R2_ACCESS_KEY_ID environment variable.");
    }

    // Determine Org ID (fetch from user's org membership or context)
    // For now, fetch the first org the user belongs to
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
    
    // Mark step as completed if it exists, or create it
    await updateOnboardingStep(session.user.id, `Upload ${docType}`, "COMPLETED", userOrg.orgId);

    revalidatePath("/onboarding");
    return { success: true, url: fileUrl };
  } catch (error) {
    return { error: "Failed to upload document" };
  }
}

// Helper to update or insert step status
async function updateOnboardingStep(userId: string, stepName: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED", orgId?: string) {
    // If orgId is not provided, fetch it
    let targetOrgId = orgId;
    if (!targetOrgId) {
         const userOrg = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, userId),
        });
        targetOrgId = userOrg?.orgId;
    }
    
    if (!targetOrgId) return; // Should handle error
    
    // Check if step exists
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
