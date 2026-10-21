"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePublicKbFileDownloadUrl } from "@/hooks/api/kb/public-file-download";

interface PublicFileDownloadButtonProps {
  shareToken: string;
}

export function PublicFileDownloadButton({ shareToken }: PublicFileDownloadButtonProps) {
  const download = usePublicKbFileDownloadUrl(shareToken);

  const handleDownload = useCallback(() => {
    download.mutate(undefined, {
      onSuccess: (result) => window.open(result.url, "_blank", "noopener,noreferrer"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [download]);

  return (
    <LoadingButton variant="outline" isPending={download.isPending} onClick={handleDownload}>
      <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
      Download
    </LoadingButton>
  );
}
