"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  CommitResult,
  ImportPreview,
  RevertResult,
} from "@/types/crm/import";

/**
 * Ask what a file would do. Writes nothing.
 *
 * A mutation rather than a query even though it changes no CRM record: it is an
 * action a person takes, it is not cached, and running it twice should produce
 * two previews rather than reuse one.
 */
export function usePreviewImport() {
  return useMutation({
    mutationFn: (input: {
      filename?: string;
      headers: string[];
      rows: string[][];
      overrides?: Record<string, string>;
    }) => apiClient.post<ImportPreview>("/crm/imports/preview", input),
  });
}

/**
 * How many times a single import may be asked to continue.
 *
 * Each call commits for about twenty seconds, so this is roughly ten minutes of
 * work — far beyond the 5,000-row ceiling the upload accepts. It exists so that
 * a server that somehow stops making progress cannot spin here forever.
 */
const MAX_COMMIT_CALLS = 30;

export function useCommitImport() {
  const queryClient = useQueryClient();

  return useMutation({
    /**
     * Commits until the server says it is done.
     *
     * The server works under a time budget and returns `complete: false` with
     * the rows it did not reach, rather than holding one request open until a
     * statement timeout kills it and rolls the whole thing back. So finishing
     * is the client's job. Each iteration is a separate request, which matters:
     * `authedFetch` mints a fresh `Idempotency-Key` per request, and reusing one
     * would make the server replay the first response and the import would never
     * advance.
     */
    mutationFn: async ({
      crmImportId,
      onProgress,
    }: {
      crmImportId: string;
      onProgress?: (soFar: CommitResult) => void;
    }): Promise<CommitResult> => {
      const total: CommitResult = {
        created: 0,
        updated: 0,
        failed: 0,
        remaining: 0,
        complete: false,
      };

      for (let call = 0; call < MAX_COMMIT_CALLS; call++) {
        const batch = await apiClient.post<CommitResult>(
          `/crm/imports/${crmImportId}/commit`,
          {},
        );
        total.created += batch.created;
        total.updated += batch.updated;
        total.failed += batch.failed;
        // Not summed: it is what is left right now, not a running tally.
        total.remaining = batch.remaining;
        total.complete = batch.complete;

        if (batch.complete) return total;
        onProgress?.({ ...total });

        // No progress and not complete means asking again will not help.
        if (batch.created + batch.updated + batch.failed === 0)
          throw new Error(
            `The import stopped with ${batch.remaining} rows left and made no progress. Nothing was undone — you can try again.`,
          );
      }

      throw new Error(
        `The import is taking more calls than expected and has been stopped with ${total.remaining} rows left. Nothing was undone.`,
      );
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

  return useMutation({
    mutationFn: (crmImportId: string) =>
      apiClient.post<RevertResult>(`/crm/imports/${crmImportId}/revert`, {}),
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
