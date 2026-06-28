"use server";

import { serverApiClient } from "@/lib/api/server-client";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export type DocumentType =
  | "CONTRACT"
  | "CERTIFICATE"
  | "ID_PROOF"
  | "PAYSLIP"
  | "POLICY"
  | "OFFER_LETTER"
  | "RESUME"
  | "OTHER";

export interface DocumentRecord {
  id: number;
  orgId: string;
  userId: string | null;
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  description: string | null;
  category: string | null;
  isPublic: boolean;
  expiryDate: string | null;
  tags: string[] | null;
  uploadedBy: string | null;
  isActive: boolean;
  version: number | null;
  parentDocumentId: number | null;
  departmentId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateDocumentInput {
  name: string;
  description?: string;
  type: DocumentType;
  category?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  userId?: string;
  departmentId?: number;
  isPublic?: boolean;
  expiryDate?: string;
  tags?: string[];
}

interface UpdateDocumentInput {
  name?: string;
  description?: string | null;
  type?: DocumentType;
  category?: string | null;
  userId?: string | null;
  isPublic?: boolean;
  tags?: string[];
  expiryDate?: string | null;
}

interface DocumentStats {
  total: number;
  byType: Record<string, number>;
  expiringIn30Days: number;
}

interface ExpiryResponse {
  expiringDocuments: DocumentRecord[];
  expiringCertifications: unknown[];
  totalExpiring: number;
}

export async function uploadDocument(data: CreateDocumentInput) {
  try {
    const document = await serverApiClient.post<DocumentRecord>("/hr/documents", data);
    revalidatePath("/hr/documents");
    return { success: true, document };
  } catch (error) {
    logger.error("Failed to upload document", error);
    return { error: "Failed to upload document" };
  }
}

export async function getDocuments(filters?: {
  userId?: string;
  type?: DocumentType;
}) {
  try {
    const params: Record<string, unknown> = {};
    if (filters?.userId) params.userId = filters.userId;
    if (filters?.type) params.type = filters.type;
    return await serverApiClient.get<DocumentRecord[]>("/hr/documents", params);
  } catch (error) {
    logger.error("Failed to fetch documents", error);
    return [];
  }
}

export async function getMyDocuments() {
  try {
    return await serverApiClient.get<DocumentRecord[]>("/hr/documents");
  } catch (error) {
    logger.error("Failed to fetch my documents", error);
    return [];
  }
}

export async function getEmployeeDocuments(employeeId: string) {
  try {
    return await serverApiClient.get<DocumentRecord[]>("/hr/documents", {
      userId: employeeId,
    });
  } catch (error) {
    logger.error("Failed to fetch employee documents", error);
    return [];
  }
}

export async function getCompanyPolicies() {
  try {
    return await serverApiClient.get<DocumentRecord[]>("/hr/documents", {
      type: "POLICY",
    });
  } catch (error) {
    logger.error("Failed to fetch company policies", error);
    return [];
  }
}

export async function getPublicDocuments() {
  try {
    return await serverApiClient.get<DocumentRecord[]>("/hr/documents");
  } catch (error) {
    logger.error("Failed to fetch public documents", error);
    return [];
  }
}

export async function getExpiringDocuments(daysAhead: number = 30) {
  try {
    return await serverApiClient.get<ExpiryResponse>("/hr/document-expiry", {
      days: daysAhead,
    });
  } catch (error) {
    logger.error("Failed to fetch expiring documents", error);
    return null;
  }
}

export async function updateDocument(documentId: number, data: UpdateDocumentInput) {
  try {
    const updated = await serverApiClient.patch<DocumentRecord>(
      `/hr/documents/${documentId}`,
      data,
    );
    revalidatePath("/hr/documents");
    return { success: true, document: updated };
  } catch (error) {
    logger.error("Failed to update document", error);
    return { error: "Failed to update document" };
  }
}

export async function deleteDocument(documentId: number) {
  try {
    await serverApiClient.delete<{ success: boolean }>(`/hr/documents/${documentId}`);
    revalidatePath("/hr/documents");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete document", error);
    return { error: "Failed to delete document" };
  }
}

export async function getDocumentStats() {
  try {
    return await serverApiClient.get<DocumentStats>("/hr/documents/stats");
  } catch (error) {
    logger.error("Failed to fetch document stats", error);
    return null;
  }
}
