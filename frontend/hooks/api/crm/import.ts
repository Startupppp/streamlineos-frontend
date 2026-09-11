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


/**
 * Ask what a file would do. Writes nothing.
 *
 * A mutation rather than a query even though it changes no CRM record: it is an
 * action a person takes, it is not cached, and running it twice should produce
 * two previews rather than reuse one.
 */
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

/**
 * How long to wait between polls.
 *
 * The server works in short attempts and returns as soon as one is spent, so
 * polling faster than this buys nothing and costs a request per second.
 */
const POLL_MS = 1_500;

/** A ceiling on polling, so a job that stops advancing cannot spin forever. */
const MAX_POLLS = 400;

export function useCommitImport() {
  const queryClient = useQueryClient();

  return useAuthorizedMutation("crm:imports:manage", {
    mutationKey: ["crm", "imports", "commit"],
    /**
     * Starts the import, then polls until it says it is done.
     *
     * The commit is a durable workflow: one POST starts (or re-joins) the run
     * and executes a single attempt, so finishing takes several calls. The only
     * terminating condition is `complete`.
     *
     * The previous version also stopped when a call reported no progress, on the
     * reasoning that a stalled pass could not be helped by asking again. That
     * was true of the inline implementation and is false now — a poll landing
     * between attempts legitimately reports zero, and treating it as fatal would
     * abandon a healthy import.
     */
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
      // An import touches parties, contacts and subjects at once; anything on
      // screen reading any of them is now stale.
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

/**
 * Download an export.
 *
 * Goes through the API client so the request carries the session the same way
 * every other one does — a bare anchor to the endpoint would be unauthenticated
 * and would 401 in a new tab.
 */
export async function downloadExport(entity: string, format: "csv" | "json"): Promise<void> {
  const isJson = format === "json" || entity === "archive";
  const path = entity === "archive" ? "/crm/export/archive" : "/crm/export";
  const params = entity === "archive" ? undefined : { entity, format };

  /**
   * `download`, not `get`. The export endpoint writes its body with `res.send`,
   * bypassing the envelope interceptor — so a CSV arrives as raw `text/csv`,
   * and `apiClient.get` would hand it to `parseApiResponse`, which calls
   * `res.json()` with no guard on the success path. Every CSV export therefore
   * failed with a `SyntaxError` surfaced as a toast, and nothing downloaded.
   *
   * Taking the `Blob` also preserves the server's exact bytes rather than
   * re-serialising them, which matters for the JSON archive: parsing and
   * re-stringifying it reformats a file the user may diff or re-import.
   */
  const blob = await apiClient.download(path, params);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${entity}-${new Date().toISOString().slice(0, 10)}.${isJson ? "json" : "csv"}`;
  // Appended before clicking: a detached anchor's click is ignored outside Chrome.
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked, or every export leaks a blob for the life of the tab.
  URL.revokeObjectURL(url);
}
