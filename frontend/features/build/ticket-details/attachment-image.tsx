"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { getSignedFileUrl } from "@/hooks/common/use-file-url";
import { resolveImageUrl } from "@/lib/utils";

interface AttachmentImageProps {
  fileUrl: string;
  fileName: string;
}

export function AttachmentImage({ fileUrl, fileName }: AttachmentImageProps) {
  const { data: imageSrc, isLoading } = useQuery({
    queryKey: platformCoreQueryKeys.attachmentSignedUrl(fileUrl),
    queryFn: () => getSignedFileUrl(fileUrl).catch(() => fileUrl),
    staleTime: 4 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={imageSrc ?? resolveImageUrl(fileUrl) ?? fileUrl}
      alt={fileName}
      fill
      unoptimized
      className="object-cover"
    />
  );
}
