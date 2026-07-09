"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import { TiptapToolbar } from "./tiptap-toolbar";

interface TiptapBubbleMenuProps {
  editor: Editor;
  onImageInsert?: () => void;
}

export function TiptapBubbleMenu({ editor, onImageInsert }: TiptapBubbleMenuProps) {
  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-md border bg-popover shadow-md"
    >
      <TiptapToolbar editor={editor} onImageInsert={onImageInsert} compact />
    </BubbleMenu>
  );
}
