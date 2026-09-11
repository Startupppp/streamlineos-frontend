"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const storageUploadContract = lazyContract(() =>
  import("@/hooks/api/chat-extra-schema").then((m) => m.storageUploadContract),
);

interface UploadResult {
  key: string;
  size: number;
  mimeType: string;
}

interface UploadVariables {
  file: File;
  folder?: string;
}

async function uploadFileRequest({
  file,
  folder = "uploads",
}: UploadVariables): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  /**
   * The server's measured values, not the client's declared ones. `file.size`
   * and `file.type` are what the browser was told by the picker; the upload seam
   * re-measures the bytes it actually stored (and may have compressed or
   * transcoded), so returning the declared pair stores a size and a MIME type
   * that describe a different object from the one in the bucket.
   */
  const data = await apiClient.upload<UploadResult>(
    "/storage/upload",
    formData,
    storageUploadContract,
  );
  return {
    key: data.key,
    size: data.size,
    mimeType: data.mimeType,
  };
}

export function useUploadFile() {
  return useMutation({
    mutationKey: ["upload", "file"],
    mutationFn: uploadFileRequest,
  });
}
