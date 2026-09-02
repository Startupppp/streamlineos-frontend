"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

  const data = await apiClient.upload<UploadResult>("/storage/upload", formData);
  return {
    key: data.key,
    size: file.size,
    mimeType: file.type,
  };
}

export function useUploadFile() {
  return useMutation({
    mutationKey: ["upload", "file"],
    mutationFn: uploadFileRequest,
  });
}
