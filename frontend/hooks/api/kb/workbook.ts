"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type {
  KbWorkbook,
  KbWorkbookInput,
  KbWorkbookOp,
} from "./page-types";

const kbWorkbookContract = lazyContract(() =>
  import("./kb-pages-schema").then((m) => m.kbWorkbookContract),
);

const kbWorkbookUpdateContract = lazyContract(() =>
  import("./kb-pages-schema").then((m) => m.kbWorkbookUpdateContract),
);

export function useKbWorkbook(pageId: number) {
  const canView = useCan("kb:pages:view");
  return useQuery({
    ...INLINE_READ_ERROR,
    queryKey: knowledgeAndSurveysQueryKeys.kb.pageWorkbook(pageId),
    queryFn: ({ signal }) =>
      apiClient.get<KbWorkbook>(
        `/kb/pages/${pageId}/workbook`,
        undefined,
        signal,
        kbWorkbookContract,
      ),
    staleTime: 60_000,
    enabled: canView && Number.isFinite(pageId) && pageId > 0,
  });
}

type WorkbookUpdateInput = {
  pageId: number;
  expectedContentRevision: number;
  operations: KbWorkbookOp[];
};

type WorkbookUpdateResponse = { contentRevision: number; updatedAt: string };

export function useUpdateKbWorkbook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "workbook", "update"],
    mutationFn: ({ pageId, expectedContentRevision, operations }: WorkbookUpdateInput) =>
      apiClient.patch<WorkbookUpdateResponse>(
        `/kb/pages/${pageId}/workbook`,
        { expectedContentRevision, operations },
        undefined,
        kbWorkbookUpdateContract,
      ),
    onSuccess: (res, { pageId }) => {
      qc.setQueryData<KbWorkbook>(
        knowledgeAndSurveysQueryKeys.kb.pageWorkbook(pageId),
        (prev) => (prev ? { ...prev, contentRevision: res.contentRevision } : prev),
      );
    },
  });
}

type WorkbookReplaceInput = {
  pageId: number;
  expectedContentRevision: number;
  sheets: KbWorkbookInput["sheets"];
};

export function useReplaceKbWorkbook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "workbook", "replace"],
    mutationFn: ({ pageId, expectedContentRevision, sheets }: WorkbookReplaceInput) =>
      apiClient.put<KbWorkbook>(
        `/kb/pages/${pageId}/workbook`,
        { expectedContentRevision, sheets },
        undefined,
        kbWorkbookContract,
      ),
    onSuccess: (workbook, { pageId }) => {
      qc.setQueryData<KbWorkbook>(
        knowledgeAndSurveysQueryKeys.kb.pageWorkbook(pageId),
        workbook,
      );
    },
  });
}
