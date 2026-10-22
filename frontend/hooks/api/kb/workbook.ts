"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { knowledgeAndSurveysQueryKeys } from "@/lib/query-keys/knowledge-and-surveys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { KbWorkbook, KbWorkbookSheet } from "./kb-pages-schema";
import type { KbPageDetail, KbWorkbookOp, KbWorkbookSheetInput } from "./page-types";

const kbWorkbookContract = lazyContract(() =>
  import("./kb-pages-schema").then((m) => m.kbWorkbookContract),
);

const kbWorkbookSaveContract = lazyContract(() =>
  import("./kb-pages-schema").then((m) => m.kbWorkbookSaveContract),
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

type WorkbookSaveResponse = { contentRevision: number; updatedAt: string };

type WorkbookSaveBase = {
  pageId: number;
  expectedContentRevision: number;
  savedSheets: KbWorkbookSheet[];
};

function writeSavedWorkbook(
  qc: QueryClient,
  { pageId, savedSheets }: WorkbookSaveBase,
  res: WorkbookSaveResponse,
) {
  qc.setQueryData<KbWorkbook>(knowledgeAndSurveysQueryKeys.kb.pageWorkbook(pageId), {
    pageId,
    contentRevision: res.contentRevision,
    sheets: savedSheets,
  });
  qc.setQueryData<KbPageDetail>(knowledgeAndSurveysQueryKeys.kb.page(pageId), (prev) =>
    prev ? { ...prev, contentRevision: res.contentRevision, updatedAt: res.updatedAt } : prev,
  );
}

export function useUpdateKbWorkbook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "workbook", "update"],
    mutationFn: ({
      pageId,
      expectedContentRevision,
      operations,
    }: WorkbookSaveBase & { operations: KbWorkbookOp[] }) =>
      apiClient.patch<WorkbookSaveResponse>(
        `/kb/pages/${pageId}/workbook`,
        { expectedContentRevision, operations },
        undefined,
        kbWorkbookSaveContract,
      ),
    onSuccess: (res, variables) => {
      writeSavedWorkbook(qc, variables, res);
    },
  });
}

export function useReplaceKbWorkbook() {
  const qc = useQueryClient();
  return useAuthorizedMutation("kb:pages:update", {
    mutationKey: ["kb", "pages", "workbook", "replace"],
    mutationFn: ({
      pageId,
      expectedContentRevision,
      sheets,
    }: WorkbookSaveBase & { sheets: KbWorkbookSheetInput[] }) =>
      apiClient.put<WorkbookSaveResponse>(
        `/kb/pages/${pageId}/workbook`,
        { expectedContentRevision, sheets },
        undefined,
        kbWorkbookSaveContract,
      ),
    onSuccess: (res, variables) => {
      writeSavedWorkbook(qc, variables, res);
    },
  });
}
