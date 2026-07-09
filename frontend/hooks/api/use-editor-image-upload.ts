"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface EditorImageUploadResult {
  url: string;
  key: string;
}

async function uploadEditorImage(file: File): Promise<EditorImageUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "editor-images");
  const data = await apiClient.upload<EditorImageUploadResult>("/storage/upload", formData);
  return { url: data.url, key: data.key };
}

export function useEditorImageUpload() {
  return useMutation({
    mutationKey: ["editor-image-upload"],
    mutationFn: uploadEditorImage,
  });
}
