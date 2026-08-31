"use client";

import { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import type { PlateEditor } from "platejs/react";
import { NodeApi } from "platejs";
import type { TElement, Path } from "platejs";

export type PageLinkItem = { id: number; label: string };

export type PickerState = {
  query: string;
  top: number;
  left: number;
  triggerOffset: number;
  triggerPath: Path;
};

export function usePageLinkPicker(editor: PlateEditor) {
  const [picker, setPicker] = useState<PickerState | null>(null);

  const checkTrigger = useCallback(() => {
    const { selection } = editor;
    if (!selection) {
      setPicker(null);
      return;
    }

    const blockEntry = editor.api.block() as [TElement, Path] | undefined;
    if (!blockEntry) {
      setPicker(null);
      return;
    }

    const [blockNode] = blockEntry;
    const cursorOffset = selection.focus.offset;
    const blockText = NodeApi.string(blockNode);
    const textBefore = blockText.slice(0, cursorOffset);

    const match = /\[\[([^\[\]]*)$/.exec(textBefore);
    if (match) {
      const query = match[1] ?? "";
      const domSel = window.getSelection();
      if (!domSel || domSel.rangeCount === 0) return;
      const range = domSel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const triggerOffset = cursorOffset - match[0].length;
      setPicker({
        query,
        top: rect.bottom + 4 + window.scrollY,
        left: rect.left + window.scrollX,
        triggerOffset,
        triggerPath: selection.focus.path,
      });
    } else {
      setPicker(null);
    }
  }, [editor]);

  const selectPageLink = useCallback(
    (item: PageLinkItem) => {
      if (!picker) return;
      const { triggerOffset, triggerPath } = picker;
      const anchor = { path: triggerPath, offset: triggerOffset };
      const focus = editor.selection?.focus ?? anchor;
      editor.tf.select({ anchor, focus });
      editor.tf.delete();
      editor.tf.insertNodes({
        type: "page_link",
        pageId: item.id,
        value: item.label,
        children: [{ text: "" }],
      } as TElement);
      editor.tf.move({ unit: "offset" });
      setPicker(null);
    },
    [editor, picker],
  );

  const dismissPicker = useCallback(() => setPicker(null), []);

  return { picker, checkTrigger, selectPageLink, dismissPicker };
}

interface PageLinkPickerDropdownProps {
  picker: PickerState;
  fetchPageLinks?: (q: string) => Promise<PageLinkItem[]>;
  onSelect: (item: PageLinkItem) => void;
  onDismiss: () => void;
}

export function PageLinkPickerDropdown({
  picker,
  fetchPageLinks,
  onSelect,
  onDismiss,
}: PageLinkPickerDropdownProps) {
  const [items, setItems] = useState<PageLinkItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchPageLinks?.(picker.query)
      .then((r) => {
        if (!cancelled) {
          setItems(r);
          setActiveIndex(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [picker.query, fetchPageLinks]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        onSelect(items[activeIndex]!);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [items, activeIndex, onSelect, onDismiss]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        top: picker.top,
        left: picker.left,
        zIndex: 9999,
      }}
      className="min-w-[200px] max-w-[300px] rounded-md border border-border bg-popover shadow-lg p-1"
    >
      {items.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {picker.query ? "No pages found" : "Search pages..."}
        </div>
      ) : (
        items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            className={`w-full text-left px-3 py-1.5 text-sm rounded-sm ${idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
          >
            📄 {item.label}
          </button>
        ))
      )}
    </div>,
    document.body,
  );
}
