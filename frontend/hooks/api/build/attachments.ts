"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { isLocalUrl } from "@/hooks/common/use-file-url";
import { storageKeyFromUrl } from "@/lib/utils";

export function useAttachmentSignedUrl(fileUrl: string) {
  return useQuery<string>({
    queryKey: platformCoreQueryKeys.attachmentSignedUrl(fileUrl),
    queryFn: async () => {
      if (!fileUrl) return fileUrl;
      const reference = storageKeyFromUrl(fileUrl);
      if (isLocalUrl(reference)) return reference;
      const params = /^https?:\/\//i.test(reference)
        ? { url: reference }
        : { key: reference };
      try {
        const data = await apiClient.get<{ url: string }>("/storage/download", params);
        return data.url;
      } catch {
        return fileUrl;
      }
    },
    staleTime: 4 * 60 * 1000,
  });
}
