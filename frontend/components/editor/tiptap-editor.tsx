"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TiptapToolbar } from "./tiptap-toolbar";
import { useEffect, useRef } from "react";

export interface TiptapEditorProps {
  content?: unknown;
  onChange?: (json: Record<string, unknown>) => void;
  onChangeHtml?: (html: string) => void;
  output?: "json" | "html";
  placeholder?: string;
  editable?: boolean;
  minHeightClassName?: string;
  contentKey?: string | number;
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

export function TiptapEditor({
  content,
  onChange,
  onChangeHtml,
  output = "json",
  placeholder = "Start writing...",
  editable = true,
  minHeightClassName = "min-h-[300px]",
  contentKey,
}: TiptapEditorProps) {
  const lastInitKey = useRef<string | number | boolean>(false);

  const extensions = [
    StarterKit,
    Placeholder.configure({ placeholder }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Underline,
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

  return (
    <div className="rounded-md border bg-background">
      {editable && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
