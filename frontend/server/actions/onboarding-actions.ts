"use server";

import { z } from "zod";
import { serverApiClient } from "@/lib/api/server-client";
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

  const parsed = personalDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const data = parsed.data;

  try {
    await serverApiClient.patch("/onboarding/personal-details", {
      phone: data.phone,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      emergencyName: data.emergencyName,
      emergencyRelation: data.emergencyRelation,
      emergencyPhone: data.emergencyPhone,
      addressLine1: data.addressLine1,
      addressCity: data.addressCity,
      addressState: data.addressState,
      addressPostalCode: data.addressPostalCode,
      addressCountry: data.addressCountry,
    });
    return { success: true };
  } catch {
    return { error: "Failed to update profile" };
  }
}

export async function updateBankDetails(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const body = {
    accountHolder: String(formData.get("accountHolder") ?? ""),
    bankName: String(formData.get("bankName") ?? ""),
    accountNumber: String(formData.get("accountNumber") ?? ""),
    ifsc: String(formData.get("ifsc") ?? ""),
    branch: String(formData.get("branch") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
  };

  try {
    await serverApiClient.patch("/onboarding/bank-details", body);
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
    const payload = new FormData();
    payload.append("file", file, file.name);
    payload.append("type", docType);
    const result = await serverApiClient.upload<{ url: string }>("/onboarding/documents", payload);
    return { success: true, url: result.url };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to upload document";
    return { error: message };
  }
}

export async function submitOnboarding() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await serverApiClient.post("/onboarding/submit");
    await invalidateUserSession(session.user.id);
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Failed to submit onboarding" };
  }
}
