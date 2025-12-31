"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Download, Eye, File } from "lucide-react";
import { cn } from "../../lib/utils";

interface FileViewerProps {
  url: string;
  fileName?: string;
  mimeType?: string;
  className?: string;
  showDownload?: boolean;
}

export function FileViewer({
  url,
  fileName,
  mimeType,
  className,
  showDownload = true,
}: FileViewerProps) {
  const [isViewing, setIsViewing] = useState(false);

  const isImage = mimeType?.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  const handleDownload = async () => {
    try {
      const key = url.includes("/") ? url.split("/").pop() : url;
      const response = await fetch(`/api/storage/download?key=${key}`);
      const data = await response.json();

      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      // Error downloading file
    }
  };

  const handleView = () => {
    if (isImage || isPdf) {
      setIsViewing(true);
    } else {
      handleDownload();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <File className="h-4 w-4" />
        <span className="text-sm truncate flex-1">{fileName || "File"}</span>
        {isImage || isPdf ? (
          <Button variant="ghost" size="icon" onClick={handleView}>
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}
        {showDownload && (
          <Button variant="ghost" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isViewing && isImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setIsViewing(false)}
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {isViewing && isPdf && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full w-full h-full">
            <iframe src={url} className="w-full h-full" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setIsViewing(false)}
            >
              ×
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
