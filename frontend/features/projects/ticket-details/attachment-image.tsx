"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getSignedFileUrl } from "@/hooks/common/use-file-url";

interface AttachmentImageProps {
  fileUrl: string;
  fileName: string;
}

export function AttachmentImage({ fileUrl, fileName }: AttachmentImageProps) {
  const { data: imageSrc, isLoading } = useQuery({
    queryKey: ["attachment-signed-url", fileUrl],
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
      src={imageSrc ?? fileUrl}
      alt={fileName}
      fill
      unoptimized
      className="object-cover"
    />
  );
}
