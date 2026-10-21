"use client";

import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";

const publicFileDownloadUrlContract = z
  .object({ url: z.string().url(), expiresAt: z.string() })
  .strict();

export function usePublicKbFileDownloadUrl(shareToken: string) {
  return useMutation({
    mutationKey: ["public", "kb", "links", shareToken, "download-url"],
    mutationFn: () =>
      apiClient.post<z.infer<typeof publicFileDownloadUrlContract>>(
        `/public/kb/links/${encodeURIComponent(shareToken)}/download-url`,
        undefined,
        undefined,
        publicFileDownloadUrlContract,
      ),
  });
}
