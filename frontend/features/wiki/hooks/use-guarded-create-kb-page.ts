"use client";

import { toast } from "sonner";
import { useCreateKbPage } from "@/hooks/api/kb/pages";
import type { CreateKbPageInput, KbPage } from "@/hooks/api/kb/page-types";
import { useSubmitGuard } from "@/hooks/common/use-submit-guard";
import { getErrorMessage } from "@/lib/get-error-message";

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
