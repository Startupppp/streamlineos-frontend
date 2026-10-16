"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { isLocalUrl, storageReferenceParams } from "@/hooks/common/use-file-url";
import { storageKeyFromUrl } from "@/lib/utils";

const signedUrlC = lazyContract(() =>
  import("@/hooks/common/file-url-schema").then((m) => m.signedUrlContract),
);

export function useAttachmentSignedUrl(fileUrl: string) {
  return useQuery<string | null>({
    queryKey: platformCoreQueryKeys.attachmentSignedUrl(fileUrl),
    queryFn: async ({ signal }) => {
      if (!fileUrl) return null;
      const reference = storageKeyFromUrl(fileUrl);
      if (isLocalUrl(reference)) return reference;
      try {
        const data = await apiClient.get<{ url: string }>("/storage/download", storageReferenceParams(reference), signal, signedUrlC);
        return data.url;
      } catch {
        return null;
      }
    },
    staleTime: 4 * 60 * 1000,
    throwOnError: false,
  });
}
