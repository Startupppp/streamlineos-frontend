"use client";

import { nanoid } from "nanoid";
import { toast } from "sonner";
import type { Path, TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import { getErrorMessage } from "@/lib/get-error-message";

export const PLACEHOLDER_NODE_TYPE = "placeholder";

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

function isNodeLike(node: unknown): node is { type?: unknown; children?: unknown } {
  return typeof node === "object" && node !== null;
}

function keepPersistedNode(node: unknown): unknown[] {
  if (!isNodeLike(node)) return [node];
  if (node.type === PLACEHOLDER_NODE_TYPE) return [];
  if (!Array.isArray(node.children)) return [node];
  const children = node.children.flatMap(keepPersistedNode);
  return [{ ...node, children: children.length > 0 ? children : [{ text: "" }] }];
}

export function withoutPendingUploads(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.flatMap(keepPersistedNode);
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
    type: PLACEHOLDER_NODE_TYPE,
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
  } catch (error) {
    const path = findPlaceholderPath(editor, placeholderId);
    if (path) editor.tf.removeNodes({ at: path });
    toast.error(`Upload failed: ${file.name}`, { description: getErrorMessage(error) });
  }
}
