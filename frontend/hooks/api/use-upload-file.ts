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
