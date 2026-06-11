"use client";

import { useMutation } from "@tanstack/react-query";

export interface UploadResult {
  url: string;
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

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Upload failed");
  }
  const data = (await response.json()) as UploadResult;
  return {
    url: data.url,
    key: data.key,
    size: file.size,
    mimeType: file.type,
  };
}

export function useUploadFile() {
  return useMutation({
    mutationFn: uploadFileRequest,
  });
}
