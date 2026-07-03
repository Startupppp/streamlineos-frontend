"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TiptapToolbar } from "./tiptap-toolbar";
import { buildDocumentExtensions } from "./document-extensions";
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
  variant?: "basic" | "document";
  fetchMentionUsers?: (query: string) => Promise<Array<{ id: string; label: string }>>;
  fetchPageLinks?: (query: string) => Promise<Array<{ id: number; label: string }>>;
  onNavigateToPage?: (pageId: number) => void;
}

function normalizeToHtml(raw: unknown): string | Record<string, unknown> | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object") return raw as Record<string, unknown>;
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
  variant = "basic",
  fetchMentionUsers,
  fetchPageLinks,
  onNavigateToPage,
}: TiptapEditorProps) {
  const lastInitKey = useRef<string | number | boolean>(false);

  const fetchMentionUsersRef = useRef(fetchMentionUsers);
  fetchMentionUsersRef.current = fetchMentionUsers;

  const fetchPageLinksRef = useRef(fetchPageLinks);
  fetchPageLinksRef.current = fetchPageLinks;

  const onNavigateToPageRef = useRef(onNavigateToPage);
  onNavigateToPageRef.current = onNavigateToPage;

  const isDocument = variant === "document";

  const extensions = isDocument
    ? buildDocumentExtensions({
        placeholder,
        fetchMentionUsers: (q) => fetchMentionUsersRef.current?.(q) ?? Promise.resolve([]),
        fetchPageLinks: (q) => fetchPageLinksRef.current?.(q) ?? Promise.resolve([]),
      })
    : [
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
      handleClick(_view, _pos, event) {
        if (!onNavigateToPageRef.current) return false;
        const target = event.target as Element;
        const chip = target.closest("[data-type='pageLink']");
        if (!chip) return false;
        const rawId = chip.getAttribute("data-id");
        if (!rawId) return false;
        const pageId = parseInt(rawId, 10);
        if (!isNaN(pageId)) {
          onNavigateToPageRef.current(pageId);
          return true;
        }
        return false;
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
    <div className={`rounded-md border bg-background${isDocument ? " document-editor" : ""}`}>
      {editable && !isDocument && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
