"use client";

import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

function isLocalUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/") || url.startsWith("/")) return true;
  if (url.includes("/uploads/")) return true;
  if (url.includes("dicebear.com") || url.includes("avataaars")) return true;
  return false;
}

export async function getSignedFileUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) {
    throw new Error("No file URL provided");
  }
  if (isLocalUrl(fileUrl)) {
    return fileUrl;
  }
  const data = await apiClient.get<{ url: string }>("/storage/download", { url: fileUrl });
  return data.url;
}

export async function getProtectedFileUrl(endpoint: string): Promise<string> {
  const data = await apiClient.get<{ url: string }>(endpoint);
  return data.url;
}

export async function viewProtectedFile(endpoint: string): Promise<void> {
  try {
    window.open(await getProtectedFileUrl(endpoint), "_blank", "noopener,noreferrer");
  } catch (err) {
    toast.error(getErrorMessage(err) || "Failed to open file");
  }
}

export async function downloadProtectedFile(
  endpoint: string,
  fileName: string,
): Promise<void> {
  try {
    const response = await fetch(await getProtectedFileUrl(endpoint));
    if (!response.ok) throw new Error("Failed to download file");
    const blobUrl = window.URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    toast.success("Download started");
  } catch (err) {
    toast.error(getErrorMessage(err) || "Failed to download file");
  }
}

export async function viewFile(fileUrl: string): Promise<void> {
  try {
    const url = await getSignedFileUrl(fileUrl);
    window.open(url, "_blank");
  } catch {
    toast.error("Failed to open file");
  }
}

export async function downloadFile(fileUrl: string, fileName?: string): Promise<void> {
  try {
    const downloadFileName = fileName || extractFileName(fileUrl);
    let blob: Blob;
    if (!isLocalUrl(fileUrl)) {
      blob = await apiClient.download("/storage/download", { url: fileUrl, attachment: 1 });
    } else {
      const url = await getSignedFileUrl(fileUrl);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      blob = await response.blob();
    }
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
    toast.error(getErrorMessage(err) || "Failed to download file");
  }
}

function extractFileName(url: string): string {
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];
  const match = lastPart.match(/^\d+-(.+)$/);
  return match ? match[1] : lastPart;
}

