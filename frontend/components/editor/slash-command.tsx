"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Suggestion } from "@tiptap/suggestion";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  CheckSquare,
  List,
  ListOrdered,
  Table,
  Quote,
  Minus,
  Code,
  Info,
  Image,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SuggestionList, ImageUrlInput } from "./suggestion-popup";

import "@tiptap/extension-details";
import "./extensions/callout";

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  imageInsert?: true;
  execute: (editor: Editor) => void;
}

const SLASH_ITEMS: SlashCommandItem[] = [
  {
    id: "text",
    label: "Text",
    description: "Plain paragraph",
    icon: Type,
    execute: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading1",
    label: "Heading 1",
    description: "Large heading",
    icon: Heading1,
    execute: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: "heading2",
    label: "Heading 2",
    description: "Medium heading",
    icon: Heading2,
    execute: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: "heading3",
    label: "Heading 3",
    description: "Small heading",
    icon: Heading3,
    execute: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: "todo",
    label: "To-do list",
    description: "Checklist items",
    icon: CheckSquare,
    execute: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "bullet",
    label: "Bulleted list",
    description: "Unordered list",
    icon: List,
    execute: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "numbered",
    label: "Numbered list",
    description: "Ordered list",
    icon: ListOrdered,
    execute: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "table",
    label: "Table",
    description: "Insert a table",
    icon: Table,
    execute: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "quote",
    label: "Quote",
    description: "Blockquote",
    icon: Quote,
    execute: (editor) => editor.chain().focus().setBlockquote().run(),
  },
  {
    id: "divider",
    label: "Divider",
    description: "Horizontal rule",
    icon: Minus,
    execute: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "code",
    label: "Code block",
    description: "Syntax-highlighted code",
    icon: Code,
    execute: (editor) => editor.chain().focus().setCodeBlock().run(),
  },
  {
    id: "callout",
    label: "Callout",
    description: "Highlighted info box",
    icon: Info,
    execute: (editor) => editor.chain().focus().insertCallout().run(),
  },
  {
    id: "image",
    label: "Image",
    description: "Insert image by URL",
    icon: Image,
    imageInsert: true,
    execute: () => {},
  },
  {
    id: "toggle",
    label: "Toggle",
    description: "Collapsible block",
    icon: ChevronDown,
    execute: (editor) => editor.chain().focus().setDetails().run(),
  },
];

function showImageInput(editor: Editor, insertPos: number, rect: DOMRect | null) {
  const div = document.createElement("div");
  div.className = "tiptap-suggestion-portal";
  if (rect) {
    div.style.position = "fixed";
    div.style.zIndex = "9999";
    div.style.left = `${rect.left}px`;
    div.style.top = `${rect.bottom + 4}px`;
  }
  document.body.appendChild(div);
  const root = createRoot(div);

  function cleanup() {
    root.unmount();
    div.remove();
  }

  root.render(
    createElement(ImageUrlInput, {
      onSubmit: (url: string) => {
        editor.chain().focus().insertContentAt(insertPos, { type: "image", attrs: { src: url } }).run();
        cleanup();
      },
      onCancel: cleanup,
    })
  );
}

function buildSlashRender(): () => {
  onStart: (props: SuggestionProps<SlashCommandItem>) => void;
  onUpdate: (props: SuggestionProps<SlashCommandItem>) => void;
  onExit: () => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
} {
  return () => {
    let container: HTMLDivElement | null = null;
    let root: ReturnType<typeof createRoot> | null = null;
    let selectedIndex = 0;
    let currentProps: SuggestionProps<SlashCommandItem> | null = null;

    function renderPopup() {
      if (!root || !currentProps) return;
      const items = currentProps.items.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        icon: item.icon,
      }));
      root.render(
        createElement(SuggestionList, {
          items,
          selectedIndex,
          onSelect: (index: number) => {
            const raw = currentProps?.items[index];
            if (raw) currentProps?.command(raw);
          },
        })
      );
    }

    return {
      onStart(props) {
        currentProps = props;
        selectedIndex = 0;
        container = document.createElement("div");
        container.className = "tiptap-suggestion-portal";
        document.body.appendChild(container);
        root = createRoot(container);
        renderPopup();
        const rect = props.clientRect?.() ?? null;
        if (rect && container) {
          container.style.position = "fixed";
          container.style.zIndex = "9999";
          container.style.left = `${rect.left}px`;
          container.style.top = `${rect.bottom + 4}px`;
        }
      },
      onUpdate(props) {
        currentProps = props;
        selectedIndex = 0;
        renderPopup();
        const rect = props.clientRect?.() ?? null;
        if (rect && container) {
          container.style.left = `${rect.left}px`;
          container.style.top = `${rect.bottom + 4}px`;
        }
      },
      onExit() {
        root?.unmount();
        container?.remove();
        container = null;
        root = null;
        currentProps = null;
        selectedIndex = 0;
      },
      onKeyDown({ event }) {
        if (!currentProps || currentProps.items.length === 0) return false;
        const len = currentProps.items.length;
        if (event.key === "ArrowUp") {
          selectedIndex = (selectedIndex - 1 + len) % len;
          renderPopup();
          return true;
        }
        if (event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % len;
          renderPopup();
          return true;
        }
        if (event.key === "Enter") {
          const item = currentProps.items[selectedIndex];
          if (item) currentProps.command(item);
          return true;
        }
        return false;
      },
    };
  };
}

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items({ query }) {
          const q = query.toLowerCase();
          return SLASH_ITEMS.filter(
            (item) =>
              item.label.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q)
          );
        },
        command({ editor, range, props }) {
          if (props.imageInsert) {
            editor.chain().focus().deleteRange(range).run();
            const pos = Math.min(
              editor.state.selection.anchor,
              editor.state.doc.content.size
            );
            try {
              const coords = editor.view.coordsAtPos(pos);
              showImageInput(editor, pos, coords as DOMRect);
            } catch {
              showImageInput(editor, pos, null);
            }
          } else {
            editor.chain().focus().deleteRange(range).run();
            props.execute(editor);
          }
        },
        render: buildSlashRender(),
      }),
    ];
  },
});
