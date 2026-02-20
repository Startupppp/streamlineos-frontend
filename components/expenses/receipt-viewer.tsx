"use client";

import { useState, useEffect } from "react";
import { Eye, Download, X, ZoomIn, ZoomOut, RotateCw, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSignedFileUrl, downloadFile, viewFile } from "@/hooks/use-file-url";

interface ReceiptViewerProps {
  receiptUrl: string;
  fileName?: string;
  expenseId: number;
  trigger?: React.ReactNode;
}

export function ReceiptViewer({
  receiptUrl,
  fileName,
  expenseId,
  trigger,
}: ReceiptViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const isImage =
    receiptUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ||
    receiptUrl.includes("image");
  const isPDF = receiptUrl.match(/\.pdf$/i) || receiptUrl.includes("pdf");

  // Fetch signed URL when dialog opens
  useEffect(() => {
    if (open && !signedUrl) {
      setLoadingUrl(true);
      setHasError(false);
      getSignedFileUrl(receiptUrl)
        .then((url) => {
          setSignedUrl(url);
          setLoadingUrl(false);
        })
        .catch(() => {
          // Try the download API as a proxy fallback
          fetch(`/api/storage/download?url=${encodeURIComponent(receiptUrl)}`)
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((data: { url: string }) => {
              setSignedUrl(data.url);
              setLoadingUrl(false);
            })
            .catch(() => {
              setSignedUrl(null);
              setHasError(true);
              setLoadingUrl(false);
            });
        });
    }
  }, [open, receiptUrl, signedUrl]);

  const handleDownload = async () => {
    await downloadFile(receiptUrl, fileName || `receipt-${expenseId}`);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const openInNewTab = async () => {
    await viewFile(receiptUrl);
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1"
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-medium">
              Receipt Preview
              {fileName && (
                <span className="text-muted-foreground font-normal ml-2 text-sm">
                  {fileName}
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-1">
              {isImage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  {(zoom !== 1 || rotation !== 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={openInNewTab}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-muted/30 min-h-[400px] max-h-[calc(90vh-80px)] flex items-center justify-center p-4">
            {loadingUrl ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading receipt...</p>
              </div>
            ) : isImage ? (
              <div
                className="relative transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              >
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
                    <div className="animate-pulse text-muted-foreground">
                      Loading...
                    </div>
                  </div>
                )}
                {hasError ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="p-4 bg-muted rounded-full mb-4">
                      <X className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Failed to load image
                    </p>
                    <Button variant="outline" onClick={openInNewTab}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in new tab
                    </Button>
                  </div>
                ) : (
                  <img
                    src={signedUrl || receiptUrl}
                    alt="Receipt"
                    className={cn(
                      "max-w-full max-h-[calc(90vh-120px)] object-contain rounded-lg shadow-lg",
                      isLoading && "opacity-0"
                    )}
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setIsLoading(false);
                      setHasError(true);
                    }}
                  />
                )}
              </div>
            ) : isPDF ? (
              <iframe
                src={signedUrl || receiptUrl}
                className="w-full h-[calc(90vh-120px)] border-0 rounded-lg"
                title="Receipt PDF"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="p-4 bg-muted rounded-full mb-4">
                  <Download className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">
                  This file type cannot be previewed
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={openInNewTab}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in new tab
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
