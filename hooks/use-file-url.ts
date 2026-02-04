"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Determines if a URL is a local/public URL or needs signed URL generation
 */
function isLocalUrl(url: string): boolean {
  if (!url) return false;
  // Local uploads start with /uploads/ or are relative paths
  if (url.startsWith("/uploads/") || url.startsWith("/")) return true;
  // Full URLs to our own domain with /uploads/
  if (url.includes("/uploads/")) return true;
  // Dicebear avatars and other public CDNs
  if (url.includes("dicebear.com") || url.includes("avataaars")) return true;
  return false;
}

/**
 * Gets a viewable/downloadable URL for a file.
 * For local files, returns the URL directly.
 * For R2 files, fetches a signed URL from the API.
 */
export async function getSignedFileUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) {
    throw new Error("No file URL provided");
  }

  // Local files can be accessed directly
  if (isLocalUrl(fileUrl)) {
    return fileUrl;
  }

  // For R2 files, get a signed URL
  try {
    const response = await fetch(`/api/storage/download?url=${encodeURIComponent(fileUrl)}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get file URL");
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw error;
  }
}

/**
 * Opens a file in a new tab, handling both local and R2 files
 */
export async function viewFile(fileUrl: string): Promise<void> {
  try {
    const url = await getSignedFileUrl(fileUrl);
    window.open(url, "_blank");
  } catch {
    toast.error("Failed to open file");
  }
}

/**
 * Downloads a file, handling both local and R2 files.
 * R2 files are proxied through our API to avoid CORS issues with signed URLs.
 */
export async function downloadFile(fileUrl: string, fileName?: string): Promise<void> {
  try {
    const downloadFileName = fileName || extractFileName(fileUrl);

    // For R2 files, use our API as a proxy so the browser doesn't hit CORS on the R2 domain
    if (!isLocalUrl(fileUrl)) {
      const response = await fetch(
        `/api/storage/download?url=${encodeURIComponent(fileUrl)}&attachment=1`
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to download file");
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
      return;
    }

    // Local files: get URL and fetch same-origin
    const url = await getSignedFileUrl(fileUrl);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to download file");
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    toast.success("Download started");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to download file";
    toast.error(message);
  }
}

/**
 * Extracts filename from a URL or key
 */
function extractFileName(url: string): string {
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];
  // Remove timestamp prefix if present (e.g., "1234567890-filename.pdf")
  const match = lastPart.match(/^\d+-(.+)$/);
  return match ? match[1] : lastPart;
}

/**
 * Hook for managing file URL state
 */
export function useFileUrl() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUrl = useCallback(async (fileUrl: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const url = await getSignedFileUrl(fileUrl);
      return url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get file URL";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const view = useCallback(async (fileUrl: string) => {
    setIsLoading(true);
    try {
      await viewFile(fileUrl);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const download = useCallback(async (fileUrl: string, fileName?: string) => {
    setIsLoading(true);
    try {
      await downloadFile(fileUrl, fileName);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getUrl,
    view,
    download,
  };
}
