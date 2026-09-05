"use client";

import { useQuery } from "@tanstack/react-query";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { getSignedFileUrl } from "@/hooks/common/use-file-url";

export function useAttachmentSignedUrl(fileUrl: string) {
  return useQuery<string>({
    queryKey: platformCoreQueryKeys.attachmentSignedUrl(fileUrl),
    queryFn: () => getSignedFileUrl(fileUrl).catch(() => fileUrl),
    staleTime: 4 * 60 * 1000,
  });
}
