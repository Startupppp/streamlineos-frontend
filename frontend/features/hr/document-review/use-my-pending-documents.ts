"use client";

import { useMemo } from "react";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useMyOnboardingDocs, type MyOnboardingDoc } from "@/hooks/api/hr/documents";
import { useHrDocumentTypes } from "@/hooks/api/hr/document-types";

export type PendingDocumentReason = "NOT_SUBMITTED" | "RE_UPLOAD";

export interface PendingDocument {
  documentTypeId: number;
  documentTypeName: string;
  reason: PendingDocumentReason;
  remarks: string | null;
}

const NEEDS_REUPLOAD: ReadonlySet<MyOnboardingDoc["status"]> = new Set([
  "REJECTED",
  "RE_UPLOAD_REQUESTED",
]);

export function useMyPendingDocuments() {
  const hrEnabled = useModuleEnabled("HR");
  const canUploadOwnDocs = useCan("self:onboarding-docs");
  const enabled = hrEnabled && canUploadOwnDocs;

  const { data: docsResponse, isLoading: docsLoading } = useMyOnboardingDocs({
    enabled,
  });
  const { data: documentTypes, isLoading: typesLoading } = useHrDocumentTypes({
    enabled,
  });

  const pending = useMemo((): PendingDocument[] => {
    if (!enabled) return [];
    const myDocs = docsResponse?.data ?? [];

    const latestByType = new Map<number, MyOnboardingDoc>();
    for (const doc of myDocs) {
      const existing = latestByType.get(doc.documentTypeId);
      if (!existing || (doc.version ?? 0) >= (existing.version ?? 0)) {
        latestByType.set(doc.documentTypeId, doc);
      }
    }

    const items: PendingDocument[] = [];

    for (const type of documentTypes ?? []) {
      if (type.isActive === false || !type.isMandatory) continue;
      const latest = latestByType.get(type.id);
      if (!latest) {
        items.push({
          documentTypeId: type.id,
          documentTypeName: type.name,
          reason: "NOT_SUBMITTED",
          remarks: null,
        });
      }
    }

    for (const doc of latestByType.values()) {
      if (!NEEDS_REUPLOAD.has(doc.status)) continue;
      items.push({
        documentTypeId: doc.documentTypeId,
        documentTypeName: doc.documentTypeName,
        reason: "RE_UPLOAD",
        remarks: doc.remarks,
      });
    }

    return items;
  }, [enabled, docsResponse, documentTypes]);

  return {
    pending,
    count: pending.length,
    isLoading: enabled && (docsLoading || typesLoading),
    canUpload: enabled,
  };
}
