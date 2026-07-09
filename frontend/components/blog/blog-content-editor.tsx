"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";
import { TiptapToolbar } from "@/components/editor/tiptap-toolbar";

interface BlogContentEditorProps {
  initialHtml?: string;
  onChange: (html: string, json: Record<string, unknown>) => void;
  placeholder?: string;
}

export function BlogContentEditor({
  initialHtml,
  onChange,
  placeholder = "Write your article…",
}: BlogContentEditorProps) {
  const initialized = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline" },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Image.configure({ HTMLAttributes: { class: "rounded-lg" } }),
    ],
    content: initialHtml ?? "",
    editorProps: {
      attributes: {
        class:
          "prose blog-prose dark:prose-invert max-w-none min-h-[400px] px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getJSON() as Record<string, unknown>);
    },
  });

  useEffect(() => {
    if (editor && initialHtml && !initialized.current) {
      editor.commands.setContent(initialHtml);
      initialized.current = true;
    }
  }, [editor, initialHtml]);

  return (
    <div className="overflow-hidden rounded-md border border-input bg-background">
      {editor && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
