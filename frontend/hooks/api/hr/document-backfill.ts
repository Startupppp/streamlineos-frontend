"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const backfillLazy = lazyContract(() => import("@/hooks/api/hr/document-backfill-schema").then((m) => m.documentBackfillContract));

export type BackfillAudience = "ALL_EMPLOYEES" | "HR_ONLY";

export interface DocumentBackfillPage {
  dryRun: boolean;
  scanned: number;
  eligible: number;
  proposals: { allEmployees: number; hrOnly: number };
  skipped: { alreadyClassified: number; belongsToAnEmployee: number; typeNotAllowed: number; hiringArtefact: number; inactive: number };
  applied: number;
  nextCursor: number | null;
  done: boolean;
  sample: Array<{ documentId: number; name: string; audience: BackfillAudience }>;
}

export interface DocumentBackfillInput {
  dryRun: boolean;
  cursor: number;
  limit?: number;
}

export function useBackfillDocuments() {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:documents:publish", {
    mutationKey: ["hr", "documents", "kbBackfill"],
    mutationFn: ({ dryRun, cursor, limit }: DocumentBackfillInput) =>
      apiClient.post<DocumentBackfillPage>("/hr/documents/kb-link/backfill", { dryRun, cursor, ...(limit === undefined ? {} : { limit }) }, undefined, backfillLazy),
    onSuccess: (page) => {
      if (page.dryRun || page.applied === 0) return;
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.documentsAll });
    },
  });
}
