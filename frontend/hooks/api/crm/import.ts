"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ImportProgress,
  ImportPreview,
  PlannedEntity,
} from "@/types/crm/import";
import { lazyContract } from "@/lib/api-envelope";

const importProgressLazy = lazyContract(() => import("@/hooks/api/crm/import-schema").then((m) => m.importProgressContract));
const importPreviewLazy = lazyContract(() => import("@/hooks/api/crm/import-schema").then((m) => m.importPreviewContract));


export function usePreviewImport() {
  return useAuthorizedMutation("crm:imports:manage", {
    mutationKey: ["crm", "imports", "preview"],
    mutationFn: (input: {
      filename?: string;
      entity: PlannedEntity;
      subjectTypeId?: string;
      headers: string[];
      rows: string[][];
      overrides?: Record<string, string>;
    }) => apiClient.post<ImportPreview>("/crm/imports/preview", input, undefined, importPreviewLazy),
  });
}

const POLL_MS = 1_500;

const MAX_POLLS = 400;

export function useCommitImport() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:imports:manage", {
    mutationKey: ["crm", "imports", "commit"],
    mutationFn: async ({
      crmImportId,
      onProgress,
    }: {
      crmImportId: string;
      onProgress?: (progress: ImportProgress) => void;
    }): Promise<ImportProgress> => {
      let progress = await apiClient.post<ImportProgress>(
        `/crm/imports/${crmImportId}/commit`,
        {},
        undefined,
        importProgressLazy,
      );
      onProgress?.(progress);

      for (let poll = 0; poll < MAX_POLLS && !progress.complete; poll++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        progress = await apiClient.get<ImportProgress>(`/crm/imports/${crmImportId}/progress`, undefined, undefined, importProgressLazy);
        onProgress?.(progress);
        if (progress.status === "failed")
          throw new Error(
            `The import stopped with ${progress.remaining} of ${progress.total} rows left. What it had already written stands, and you can take the whole import back.`,
          );
      }

      if (!progress.complete)
        throw new Error(
          `The import is still running after ${Math.round((MAX_POLLS * POLL_MS) / 60_000)} minutes and this page has stopped watching it. It has not been cancelled — reopen this import to see where it got to.`,
        );

      return progress;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.party.all });
    },
  });
}

export function useRevertImport() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:imports:manage", {
    mutationKey: ["crm", "imports", "revert"],
    mutationFn: (crmImportId: string) =>
      apiClient.post<ImportProgress>(`/crm/imports/${crmImportId}/revert`, {}, undefined, importProgressLazy),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.party.all });
    },
  });
}

export async function downloadExport(entity: string, format: "csv" | "json"): Promise<void> {
  const isJson = format === "json" || entity === "archive";
  const path = entity === "archive" ? "/crm/export/archive" : "/crm/export";
  const params = entity === "archive" ? undefined : { entity, format };

  const blob = await apiClient.download(path, params);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${entity}-${new Date().toISOString().slice(0, 10)}.${isJson ? "json" : "csv"}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
