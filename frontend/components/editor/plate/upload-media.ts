"use client";

import { nanoid } from "nanoid";
import { toast } from "sonner";
import type { Path, TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
export interface UploadedEditorMedia {
  key: string;
  size: number;
  mimeType: string;
  name: string;
}

export type EditorMediaType = "img" | "video" | "audio" | "file";

export type EditorMediaUploader = (file: File) => Promise<UploadedEditorMedia>;

export function mediaTypeForFile(file: File): EditorMediaType {
  if (file.type.startsWith("image/")) return "img";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

function findPlaceholderPath(
  editor: PlateEditor,
  placeholderId: string,
): Path | undefined {
  const entry = editor.api.node({
    at: [],
    match: (n) =>
      "placeholderId" in n && n["placeholderId"] === placeholderId,
  });
  return entry?.[1];
}

export async function uploadEditorMedia(
  editor: PlateEditor,
  file: File,
  uploadFile: EditorMediaUploader,
  mediaType: EditorMediaType = mediaTypeForFile(file),
): Promise<void> {
  const placeholderId = nanoid();
  const placeholderNode: TElement = {
    type: "placeholder",
    placeholderId,
    mediaType,
    name: file.name,
    children: [{ text: "" }],
  };
  editor.tf.insertNodes(placeholderNode);

  try {
    const result = await uploadFile(file);
    const path = findPlaceholderPath(editor, placeholderId);
    if (!path) return;
    editor.tf.setNodes<TElement>(
      { type: mediaType, url: result.key, name: result.name, size: result.size },
      { at: path },
    );
    editor.tf.unsetNodes(["placeholderId", "mediaType"], { at: path });
  } catch {
    const path = findPlaceholderPath(editor, placeholderId);
    if (path) editor.tf.removeNodes({ at: path });
    toast.error(`Upload failed: ${file.name}`);
  }
}
