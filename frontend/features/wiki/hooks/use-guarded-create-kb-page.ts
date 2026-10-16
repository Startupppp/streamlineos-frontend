"use client";

import { toast } from "sonner";
import { useCreateKbPage } from "@/hooks/api/kb";
import type { CreateKbPageInput, KbPage } from "@/hooks/api/kb/page-types";
import { useSubmitGuard } from "@/hooks/common/use-submit-guard";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * KB-B-018. `isPending` only disables the button after a re-render, so a fast
 * double-click on "New page" fired two POST /kb/pages and created two pages.
 * The submit guard's ref closes synchronously on the first click and reopens
 * when the request settles.
 */
export function useGuardedCreateKbPage(onCreated: (page: KbPage) => void) {
  const createPage = useCreateKbPage();
  return useSubmitGuard(
    (input: CreateKbPageInput) =>
      new Promise<void>((resolve) => {
        createPage.mutate(input, {
          onSuccess: onCreated,
          onError: (err) => toast.error(getErrorMessage(err)),
          onSettled: () => resolve(),
        });
      }),
  );
}
