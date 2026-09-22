"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  useBulkMarkRead,
  useBulkArchive,
  useBulkDelete,
} from "@/hooks/api/notifications";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

const BULK_CHUNK_SIZE = 100;

function chunkIds(ids: number[], size: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

async function executeBulk(
  ids: number[],
  mutate: (chunk: number[]) => Promise<unknown>,
): Promise<void> {
  const chunks = chunkIds(ids, BULK_CHUNK_SIZE);
  const results = await Promise.allSettled(chunks.map((chunk) => mutate(chunk)));
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0 && failed.length < chunks.length) {
    toast.warning(
      `Completed for ${chunks.length - failed.length} of ${chunks.length} groups. Some failed.`,
    );
  } else if (failed.length > 0 && failed.length === chunks.length) {
    const reason = (failed[0] as PromiseRejectedResult).reason;
    if (isApiError(reason) && reason.status === 409) {
      toast.error("Conflict: some notifications were modified. Please refresh and try again.");
    } else {
      toast.error(getErrorMessage(reason));
    }
  }
}

export interface InboxBulkActions {
  isMutating: boolean;
  runBulkMarkRead: (ids: number[]) => void;
  runBulkArchive: (ids: number[]) => void;
  runBulkDelete: (ids: number[]) => void;
}

export function useInboxBulkActions(): InboxBulkActions {
  const { mutateAsync: bulkMarkRead } = useBulkMarkRead();
  const { mutateAsync: bulkArchive } = useBulkArchive();
  const { mutateAsync: bulkDelete } = useBulkDelete();
  const [isMutating, setIsMutating] = useState(false);

  function run(ids: number[], mutate: (chunk: number[]) => Promise<unknown>) {
    if (isMutating) return;
    setIsMutating(true);
    void executeBulk(ids, mutate).finally(() => setIsMutating(false));
  }

  function runBulkMarkRead(ids: number[]) {
    run(ids, (chunk) => bulkMarkRead(chunk));
  }

  function runBulkArchive(ids: number[]) {
    run(ids, (chunk) => bulkArchive(chunk));
  }

  function runBulkDelete(ids: number[]) {
    run(ids, (chunk) => bulkDelete(chunk));
  }

  return { isMutating, runBulkMarkRead, runBulkArchive, runBulkDelete };
}
