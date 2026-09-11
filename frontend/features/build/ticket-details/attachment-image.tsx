"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useAttachmentSignedUrl } from "@/hooks/api/build/attachments";
import { resolveImageUrl } from "@/lib/utils";

interface AttachmentImageProps {
  fileUrl: string;
  fileName: string;
}

export function AttachmentImage({ fileUrl, fileName }: AttachmentImageProps) {
  const { data: imageSrc, isLoading } = useAttachmentSignedUrl(fileUrl);

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
