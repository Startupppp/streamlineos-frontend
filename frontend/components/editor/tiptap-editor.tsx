"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { TiptapToolbar } from "./tiptap-toolbar";
import { TiptapBubbleMenu } from "./tiptap-bubble-menu";
import { EditorImageContextMenu } from "./editor-image-context-menu";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";

export interface TiptapEditorProps {
  content?: unknown;
  onChange?: (json: Record<string, unknown>) => void;
  onChangeHtml?: (html: string) => void;
  output?: "json" | "html";
  placeholder?: string;
  editable?: boolean;
  minHeightClassName?: string;
  contentKey?: string | number;
  menuMode?: "bubble" | "static";
}

interface UploadResult {
  url: string;
  key: string;
}

function normalizeToHtml(raw: unknown): string | Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw !== "string") return undefined;
  if (raw === "" || raw.trimStart().startsWith("<")) return raw;
  return raw
    .split("\n")
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
      return escaped.length > 0 ? `<p>${escaped}</p>` : "<p><br></p>";
    })
    .join("");
}

async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "editor-images");
  const data = await apiClient.upload<UploadResult>("/storage/upload", formData);
  return data.url;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

interface ContextMenuState {
  position: { x: number; y: number };
  imageUrl: string;
}

export function TiptapEditor({
  content,
  onChange,
  onChangeHtml,
  output = "json",
  placeholder = "Start writing...",
  editable = true,
  minHeightClassName = "min-h-[300px]",
  contentKey,
  menuMode = "bubble",
}: TiptapEditorProps) {
  const lastInitKey = useRef<string | number | boolean>(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const extensions = [
    StarterKit,
    Placeholder.configure({ placeholder }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Underline,
    Image.configure({ HTMLAttributes: { class: "max-w-full rounded-md" } }),
  ];

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: normalizeToHtml(content),
    editable,
    onUpdate: ({ editor: e }) => {
      if (output === "html") {
        onChangeHtml?.(e.isEmpty ? "" : e.getHTML());
      } else {
        onChange?.(e.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm dark:prose-invert max-w-none ${minHeightClassName} p-4 focus:outline-none`,
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        const imageNodeType = view.state.schema.nodes["image"];
        if (!imageNodeType) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void uploadImageFile(file).then((url) => {
                view.dispatch(
                  view.state.tr.replaceSelectionWith(
                    imageNodeType.create({ src: url }),
                  ),
                );
              }).catch((err: unknown) => {
                toast.error(getErrorMessage(err));
              });
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFiles = Array.from(files).filter(isImageFile);
        if (imageFiles.length === 0) return false;
        const imageNodeType = view.state.schema.nodes["image"];
        if (!imageNodeType) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
        imageFiles.forEach((file) => {
          void uploadImageFile(file).then((url) => {
            const insertPos = pos?.pos ?? view.state.doc.content.size;
            view.dispatch(
              view.state.tr.insert(
                insertPos,
                imageNodeType.create({ src: url }),
              ),
            );
          }).catch((err: unknown) => {
            toast.error(getErrorMessage(err));
          });
        });
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed || content == null) return;
    const targetKey = contentKey ?? true;
    if (lastInitKey.current !== targetKey) {
      editor.commands.setContent(normalizeToHtml(content) ?? "", { emitUpdate: false });
      lastInitKey.current = targetKey;
    }
  }, [editor, content, contentKey]);

  const handleImageInsert = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = "";
    void uploadImageFile(file).then((url) => {
      editor.chain().focus().setImage({ src: url }).run();
    }).catch((err: unknown) => {
      toast.error(getErrorMessage(err));
    });
  }

  function handleEditorContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName !== "IMG") return;
    e.preventDefault();
    const src = (target as HTMLImageElement).src;
    setContextMenu({ position: { x: e.clientX, y: e.clientY }, imageUrl: src });
  }

  function handleContextMenuClose() {
    setContextMenu(null);
  }

  return (
    <div className="rounded-md border bg-background">
      {editable && menuMode === "static" && editor && (
        <div className="border-b">
          <TiptapToolbar editor={editor} onImageInsert={handleImageInsert} />
        </div>
      )}
      {editable && menuMode === "bubble" && editor && (
        <TiptapBubbleMenu
          editor={editor}
          onImageInsert={handleImageInsert}
        />
      )}
      <div onContextMenu={editable ? handleEditorContextMenu : undefined}>
        <EditorContent editor={editor} />
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
        aria-hidden
      />
      {contextMenu && editor && (
        <EditorImageContextMenu
          editor={editor}
          position={contextMenu.position}
          imageUrl={contextMenu.imageUrl}
          onClose={handleContextMenuClose}
        />
      )}
    </div>
  );
}
